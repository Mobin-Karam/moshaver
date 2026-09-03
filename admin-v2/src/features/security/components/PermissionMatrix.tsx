export function PermissionMatrix({
 roles,
}:{
 roles:Array<{name:string,permissions:string[]}>;
}){
 return (
  <div className="space-y-2">
   {roles.map(role=>(
    <div key={role.name}
     className="rounded-xl border p-3"
    >
      <strong>{role.name}</strong>
      <div className="text-xs mt-2">
       {role.permissions.join(", ")}
      </div>
    </div>
   ))}
  </div>
 );
}
