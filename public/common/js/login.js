//通用登陆 API js
MCSERVER.login = async function (username, password, loginSuccess, login2FA, loginError, error, send2FACode = false) {
  let saltURL = new URL("./user/login_key", location.origin);
  saltURL.searchParams.set("username", username)
  let loginParametersReq = await fetch(saltURL);
  let { salt1, salt2 } = await loginParametersReq.json();

  let HashPassword = sha256(sha256(password) + salt1); //账号注册时保存的格式
  let HashPassworded = sha256(HashPassword + salt2); //登陆的格式
  let loginReq = await fetch("./user/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: username,
      password: HashPassworded,
      "2FACode": send2FACode ? send2FACode : ""
    })
  }).catch(function () {
    error && error();
  });
  let { ResponseValue } = await loginReq.json();

  if (typeof ResponseValue === "number") {
    var command = Number.parseInt(ResponseValue);
    if (command == 302) {
      alert("您已登录,不可重复或覆盖原先登录,我们将为你跳转网页....");
      window.location.href = "../";
    }
    return;
  } else if (typeof ResponseValue === "string") {
    //后端警告操作
    if (ResponseValue === "2fa-needed") { //但是如果要两步验证那还是跳过
      login2FA && login2FA();
      return;
    }
    alert(ResponseValue);
    loginError && loginError();
    return;
  }
  //后端正常操作,判断密码与账户
  if (ResponseValue) {
    loginSuccess && loginSuccess();
  } else {
    loginError && loginError();
  }
};

// 想要执行登录，我们将自动获取
// id 为 login-userid 与 login-passwd 的 input 元素
addEventListener("DOMContentLoaded",function () {
  let logining = false;
  let loginForm = document.querySelector(".login");
  let TwoFAForm = document.querySelector(".login2FA");
  let btnLogin = document.querySelector("button#login-button") ?? {};
  //login-button    login-userid       login-passwd
  MCSERVER.btnLogin = function (TwoFA) {
    if (logining == true) return;
    logining = true;

    btnLogin.innerHTML = "正在验证...";
    btnLogin.disabled = true;

    MCSERVER.login(
      (location.pathname.endsWith("/2fa.html")) ? sessionStorage["username"] : $("#login-userid").val(),
      (TwoFA ? document.querySelector("#login-code") : document.querySelector("#login-passwd")).value,
      function () {
        //成功登陆
        btnLogin.innerHTML = "成功登陆 √";
        btnLogin.disabled = true;
        window.location.href = "../";
      },
      function () {
        btnLogin.innerHTML = "需要两步验证";
        btnLogin.disabled = true;
        logining = false;
        loginForm.style.display = "none";
        TwoFAForm.style.display = "";
      },
      function () {
        //错误
        btnLogin.innerHTML = "登陆失败 X";
        btnLogin.disabled = true;
        logining = false;
        setTimeout(function () {
          btnLogin.innerHTML = "重新验证";
          btnLogin.disabled = false;
        }, 1000);
      },
      function () {
        //服务器错误
        btnLogin.innerHTML = "服务器错误 :(";
        btnLogin.disabled = false;
      },
      TwoFA,
      $("#login-passwd").val()
    );
  };
});
