(function (global) {
  "use strict";

  function create() {
    return {
      me: null,
      students: [],
      studentPrefetch: [],
      studentFetchedCount: 0,
      studentLoadSeq: 0,
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
      conversationPrefetch: [],
      conversationOffset: 0,
      conversationHasMore: false,
      conversationLoading: false,
      conversationLoadSeq: 0,
      chatUnreadTotal: 0,
      chatConversationId: "",
      chatMessages: [],
      chatPrefetch: [],
      chatBefore: null,
      chatHasMore: false,
      chatLoadingOlder: false,
      chatPoll: null,
      authEpoch: 0,
      startupAuthRequest: null,
      loginRequest: null,
      authStatus: "checking",
      lastSyncAt: 0,
      authRetryTimer: null,
      chatSending: false,
      chatReplyTo: null,
      chatEditing: null,
    };
  }

  function resetSessionData(state) {
    state.me = null;
    state.students = [];
    state.studentPrefetch = [];
    state.studentFetchedCount = 0;
    state.studentLoadSeq = 0;
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
    state.conversationPrefetch = [];
    state.conversationOffset = 0;
    state.conversationHasMore = false;
    state.conversationLoading = false;
    state.conversationLoadSeq = 0;
    state.chatUnreadTotal = 0;
    state.chatConversationId = "";
    state.chatMessages = [];
    state.chatPrefetch = [];
    state.chatBefore = null;
    state.chatHasMore = false;
    state.chatLoadingOlder = false;
    state.chatSending = false;
    state.chatReplyTo = null;
    state.chatEditing = null;
  }

  global.MoshaverAdminState = {
    create: create,
    resetSessionData: resetSessionData,
  };
})(window);
