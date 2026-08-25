"use strict";

function createAuthValidation(deps) {
  var str = deps.str;

  function login(body) {
    var value = {
      username: str(body.username, 100),
      password: str(body.password, 300),
    };
    if (!value.username || !value.password) {
      return {
        error: {
          status: 400,
          code: "VALIDATION",
          message: "نام کاربری و رمز عبور لازم است.",
        },
      };
    }
    return { value: value };
  }

  function changePassword(body) {
    var value = {
      currentPassword: str(body.currentPassword, 300),
      newPassword: str(body.newPassword, 300),
    };
    if (value.newPassword.length < 12) {
      return {
        error: {
          status: 400,
          code: "WEAK_PASSWORD",
          message: "رمز جدید باید حداقل ۱۲ نویسه باشد.",
        },
      };
    }
    return { value: value };
  }

  return {
    login: login,
    changePassword: changePassword,
  };
}

module.exports = createAuthValidation;
