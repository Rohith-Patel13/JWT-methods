const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const jwt = require("jsonwebtoken");
/*
JavaScript require statement that imports the jsonwebtoken module. jsonwebtoken
is a popular library used for handling JSON Web Tokens (JWTs) in
Node.js applications.
*/

const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/books/", async (request, response) => {
  /*
  console.log(request.headers);
  {
      'user-agent': 'vscode-restclient',
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJhaHVsMTIzIiwiaWF0IjoxNjkxMjI4Mzc5fQ.6PrS--qZE6U4GHNX8d0ugj5_bLu1e9XZR19FnppgaZI',
      'accept-encoding': 'gzip, deflate',
      host: 'localhost:3000',
      connection: 'close'
    }
  */

  /*
  console.log(request.headers.authorization);
  Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJhaHVsMTIzIiwiaWF0IjoxNjkxMjI4Mzc5fQ.6PrS--qZE6U4GHNX8d0ugj5_bLu1e9XZR19FnppgaZI
  */
  const authorizationValue = request.headers.authorization;
  let authorizationArrayToken;
  if (authorizationValue !== undefined) {
    const authorizationArray = authorizationValue.split(" ");
    /*
  console.log(authorizationArray);
  [
  'Bearer',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJhaHVsMTIzIiwiaWF0IjoxNjkxMjI4Mzc5fQ.6PrS--qZE6U4GHNX8d0ugj5_bLu1e9XZR19FnppgaZI'
  ]
  */
    authorizationArrayToken = authorizationArray[1];
    if (authorizationArrayToken === undefined) {
      response.status(401);
      response.send("give token bro");
    } else {
      jwt.verify(
        authorizationArrayToken,
        "abcdefghxyz",
        async (error, user) => {
          if (error) {
            response.send("invalid Token");
          } else {
            const getBooksQuery = `
  SELECT
    *
  FROM
    book
  ORDER BY
    book_id;`;
            const booksArray = await db.all(getBooksQuery);
            response.send(booksArray);
          }
        }
      );
    }
  } else {
    response.send(
      "authorization not used and token not send to server from client"
    );
  }
});

// User Register API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: "rahul123" };
      const mySecretString = "abcdefghxyz";
      const jwtCreatedToken = jwt.sign(payload, mySecretString);
      response.send(jwtCreatedToken);
      //response.send("Login Success!");
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});
