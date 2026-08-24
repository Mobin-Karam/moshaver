(function (global) {
  "use strict";

  function create() {
    return {
      me: null,
      students: [],
      studentId: "",
      overview: null,
      inbox: null,
      live: null,
      liveTimer: null,
      liveClock: null,
      plannerMode: "day",
      plannerDate: "",
      plans: [],
      exams: [],
      quizzes: [],
      subjects: [],
      importData: null,
      importPreview: null,
      eventSource: null,
      conversations: [],
      chatConversationId: "",
      chatMessages: [],
      chatPoll: null,
      authEpoch: 0,
      startupAuthRequest: null,
      loginRequest: null,
      authStatus: "checking",
      lastSyncAt: 0,
      authRetryTimer: null,
      chatSending: false,
    };
  }

  function resetSessionData(state) {
    state.me = null;
    state.students = [];
    state.studentId = "";
    state.overview = null;
    state.inbox = null;
    state.live = null;
    state.plans = [];
    state.exams = [];
    state.quizzes = [];
    state.subjects = [];
    state.importData = null;
    state.importPreview = null;
    state.conversations = [];
    state.chatConversationId = "";
    state.chatMessages = [];
    state.chatSending = false;
  }

  global.MoshaverAdminState = {
    create: create,
    resetSessionData: resetSessionData,
  };
})(window);
