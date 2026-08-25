(function (global) {
  "use strict";

  global.API = global.MoshaverApiClient.create({
    csrfKey: "moshaver_student_csrf",
    eventNames: [
      "chat.message.created",
      "chat.messages.read",
      "plan.published",
      "plan.updated",
      "advisor.comment.created",
      "notification.created",
      "review.created",
      "exam.retry_reviewed",
      "exam.updated",
      "learning.updated",
    ],
  });
})(window);
