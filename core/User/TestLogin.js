var ecc = require("./simpleecc")("secp256k1");
const { from } = require("form-data");
var fetch = require("node-fetch");
const fromHEXString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const toHEXString = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
(async function () {
  var private = ecc.importKey(true, fromHEXString("056729ed273a32fd7453d6b3a5c085c3a2256bfd7976de06e5fe835df16c44a74ec591287ed154be8e438291c722e70e344df70f3d5eb7de9ec85164ec7dca419e2092987b7a72f4d347b1acbe0015a1c7cc4a5222592379f87e4943506b5c83747d5c56e55cb9518dbc15c45fb111be9adabd6c7f80cabf85e2ab75f93574e1a6f502483e77214deed4b98ff8cc6686c191e360eae3ef82b2f89bf0650885d4b62bcf58edde29626bd485be2d02783b56658143936e38137cdaf67a9d139e6c94268186f9e5095712581c799046dc8ef2df7f3f4103c5cfbda064998124c11fd2f8c6676215f201b13d984de9bd7f2a50e587046b4dffbe73fb76b9344fca196f"));
  var challengeReq = await fetch("https://ddns.ora.moe:23333/user/login");
  var challengeBody = await challengeReq.json();
  var challenge = fromHEXString(challengeBody["Challenge"]);
  var response = toHEXString(new Uint8Array(ecc.ECDSA.sign(challenge, private)));
  var postBody = new URLSearchParams();
  postBody.set("username", "test");
  postBody.set("password", response);
  postBody.set("ChallengeID", challengeBody["ChallengeID"]);
  /*
  var authBody=JSON.stringify({
    username:"#master",
    password:response,
    ChallengeID:challengeBody["ChallengeID"]
  });
  */
  console.log(postBody.toString());
})()