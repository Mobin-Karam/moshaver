(function (global) {
  "use strict";

  global.API = global.MoshaverApiClient.create({
    csrfKey: "moshaver_student_csrf",
    eventNames: [
      "chat.message.created",
      "chat.messages.read",
      "chat.message.edited",
      "chat.message.deleted",
      "chat.reaction.updated",
      "chat.mention.created",
      "chat.conversation.created",
      "chat.conversation.updated",
      "chat.member.added",
      "chat.member.removed",
      "chat.member.updated",
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
