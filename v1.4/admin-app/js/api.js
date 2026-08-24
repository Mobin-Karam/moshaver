(function (global) {
  "use strict";

  global.API = global.MoshaverApiClient.create({
    csrfKey: "moshaver_admin_csrf",
    eventNames: [
      "chat.message.created",
      "chat.messages.read",
      "presence.changed",
      "study.started",
      "study.finished",
      "quiz.completed",
      "report.submitted",
      "recovery.requested",
      "issue.created",
      "plan.published",
      "plan.updated",
      "advisor.comment.created",
      "notification.created",
      "review.created",
      "exam.retry_requested",
      "exam.retry_reviewed",
      "exam.updated",
    ],
  });
})(window);
