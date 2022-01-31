// Web handling
var express = getModule("express");
// Parse Express data
var bodyParser = getModule("body-parser");
var cookieParser = getModule("cookie-parser");

// Authorization
var jwt = getModule("jsonwebtoken");
var db = getModule("quick.db");
var fetch = getModule("node-fetch");
var env = getModule("config");
var app = express();

app.use(
  express.static(__dirname + "/public/html", {
    extensions: ["html", "htm"],
  })
);
app.use(express.static(__dirname + "/public/css"));
app.use(express.static(__dirname + "/public/js"));

app.use(bodyParser.json());
app.use(cookieParser());

// Functions & consts
const authenticateJWT = (req, res, next) => {
  const authHeader = req.cookies;
  console.log(authHeader);

  if (authHeader) {
    const token = authHeader.token;
    console.log(`Token: ${token}`);

    jwt.verify(token, `${env.JWT_SECRET}`, (err, user) => {
      if (err) {
        // console.log(err)
        return res.sendStatus(403);
      }

      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

const createToken = (user) => {
  return jwt.sign({ user }, `${env.JWT_SECRET}`, { expiresIn: "7d" });
};

// delete later, dev only
app.get("/whoami", authenticateJWT, (req, res) => {
  var token = req.cookies.token;
  console.log(token);
  var decoded = jwt.decode(token);
  console.log(decoded);

  res.json({
    signedIn: true,
    decoded: decoded,
  });
});

var VALID_USERNAME = RegExp(/^[a-zA-Z0-9\-.\_ ]{1,26}$/);

app.post("/exist", async function (req, res) {
  if (!req.body.username)
    return res.status(400).json({
      error: "Missing parameters.",
      prettyMessage: "An error has occured.",
    });
  if (!VALID_USERNAME.test(req.body.username))
    return res.status(400).json({
      error:
        "Username must be 3-26 alphanumeric characters (including [ , ., -, _]).",
      prettyMessage: "An error has occured.",
    });
  await fetch(
    "https://api.brick-hill.com/v1/user/id?username=" + req.body.username
  )
    .then((res) => res.json())
    .then(async (json) => {
      if (json.error)
        return res.json({
          error: "User does not exist.",
          prettyMessage: "An error has occured.",
        });
      await res.status(200).json(json);
      console.log(json);
    });
});

Game.command("verify", (caller, message) => {
  var args = message.split(" ");
  var code = Math.floor(100000 + Math.random() * 900000);

  caller.message(
    `[#34b1eb][VC] [#ffffff]Your verification code is [#34b1eb]${code}[#ffffff].`
  );
  db.set(`${caller.userId}`, code);
  setTimeout(function () {
    if (db.get(`${caller.userId}`)) {
      db.delete(`${caller.userId}`);
      caller.message(
        "[#34b1eb][VC] [#ffffff]Your verification code has expired due to inactivity."
      );
    }
  }, 30 * 1000);
});

app.post("/auth", (req, res) => {
  console.log(req.body);
  if (!req.body.code || !req.body.userid)
    return res.status(400).json({
      error: "Missing parameters.",
      prettyMessage: "An error has occured.",
    });

  if (req.body.code == db.get(req.body.userid)) {
    var token = createToken(req.body.userid);
    res.json({ token: token });
    // db.delete(req.body.userid);
  } else {
    res.status(401).json({
      error: "Incorrect verification code.",
      prettyMessage: "An error has occured.",
    });
  }
});

app.listen(env.PORT, () =>
  console.log(`proximity-hill listening on port: ${env.PORT}.`)
);