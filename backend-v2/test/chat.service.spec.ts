import { ApiException } from "../src/common/exceptions/api.exception";
import { ChatService } from "../src/modules/chat/chat.service";

function repo(overrides:Record<string,unknown>={}){return{find:jest.fn(async()=>[]),findOne:jest.fn(async()=>null),findOneByOrFail:jest.fn(async({id})=>({id})),exist:jest.fn(async()=>false),create:jest.fn(x=>x),save:jest.fn(async x=>x),delete:jest.fn(async()=>({affected:1})),createQueryBuilder:jest.fn(()=>({where:jest.fn().mockReturnThis(),andWhere:jest.fn().mockReturnThis(),getCount:jest.fn(async()=>0),update:jest.fn().mockReturnThis(),set:jest.fn().mockReturnThis(),execute:jest.fn(async()=>({affected:1}))})),...overrides} as any;}
function service(members=repo()){return new ChatService(repo(),repo(),repo(),{emitToUsers:jest.fn()} as any,repo(),members,repo(),repo(),repo(),{transaction:jest.fn()} as any);}

describe("ChatService membership isolation",()=>{
 it("lists only conversations where the current user is an active member",async()=>{const members=repo({find:jest.fn(async()=>[])});await expect(service(members).conversations({id:"u1"} as any)).resolves.toEqual([]);expect(members.find).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({user:{id:"u1"}})}));});
 it("rejects message access without active conversation membership",async()=>{await expect(service().messagesForConversation({id:"u1"} as any,"private-chat")).rejects.toBeInstanceOf(ApiException);});
 it("rejects blank messages before persistence",async()=>{const conversation={id:"c1",members:[]};const members=repo({findOne:jest.fn(async()=>({conversation,user:{id:"u1"}}))});await expect(service(members).send({id:"u1"} as any,"c1","  ")).rejects.toMatchObject({response:{error:expect.objectContaining({code:"MESSAGE_REQUIRED"})}});});
});
