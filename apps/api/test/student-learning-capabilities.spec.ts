import { CAPABILITIES_KEY } from "../src/common/decorators/capabilities.decorator";
import { AssessmentsController } from "../src/modules/assessments/assessments.controller";
import { StudentController, StudentParityController } from "../src/modules/students/students.controller";
import { ExamsController } from "../src/modules/exams/exams.controller";

describe("student learning capability metadata", () => {
  it.each([
    ["student progress", StudentController, "progress", "learning.read"],
    ["student plans", StudentController, "plans", "plans.read"],
    ["student dashboard", StudentController, "dashboard", "plans.read"],
    ["student reviews", StudentController, "reviews", "learning.read"],
    ["student learning items", StudentController, "learningItems", "learning.read"],
    ["create learning item", StudentParityController, "createLearning", "learning.create"],
    ["update learning item", StudentParityController, "updateLearning", "learning.update"],
    ["delete learning item", StudentParityController, "deleteLearning", "learning.update"],
    ["review learning item", StudentParityController, "reviewLearning", "learning.review"],
    ["learning history", StudentParityController, "learningHistory", "learning.read"],
    ["student exam list", ExamsController, "listForStudent", "exams.read"],
    ["student exam detail", ExamsController, "detail", "exams.read"],
    ["start student exam", ExamsController, "start", "exams.read"],
    ["submit student exam", ExamsController, "submit", "exams.read"],
    ["student exam syllabus", AssessmentsController, "studentSyllabus", "exams.read"],
    ["student syllabus progress", AssessmentsController, "progress", "exams.read"],
    ["student retry requests", AssessmentsController, "studentRetries", "exams.read"],
    ["request another exam attempt", AssessmentsController, "retry", "exams.read"],
  ] as const)("requires a capability for %s", (_label, controller, method, capability) => {
    const handler = controller.prototype[method as keyof typeof controller.prototype];
    expect(Reflect.getMetadata(CAPABILITIES_KEY, handler)).toEqual([capability]);
  });
});
