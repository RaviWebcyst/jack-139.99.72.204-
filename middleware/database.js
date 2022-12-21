import { MongoClient } from "mongodb";
import nextConnect from "next-connect";

// Middleware setup.
// NOT SECURE - DO NOT PUSH INTO PRODUCTION WITHOUT ADDING ADDITIONAL SECURITY MEASURES
const client = new MongoClient(
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@copier.hvpnm.mongodb.net/test?retryWrites=true&w=majority`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
async function database(req, res, next) {
  // console.log(client)
  await client.connect();
  req.dbClient = client;
  req.db = client.db("main");
  return next();
}

const middleware = nextConnect();
middleware.use(database);
export default middleware;
