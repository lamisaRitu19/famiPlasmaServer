const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

/* mongodb start */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.saq6uir.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const database = client.db("famiPlasma");
    const userCollection = database.collection("users");
    const familyCollection = database.collection("families");
    const inviteCollection = database.collection("invites");
    const messageCollection = database.collection("messages");

    // ----------queries of users collection-----------------

    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/users/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = { uid: uid };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get("/users/allGroupsUsers/:uid", async (req, res) => {
      const uid = req.params.uid;
      const allFamilies = familyCollection.find();
      const result = await allFamilies.toArray();
      const filteredData = result.filter((item) => item.members.includes(uid));

      const allMembers = [];
      filteredData.map((data) => {
        data.members.map((member) => allMembers.push(member));
      });

      const allUsers = userCollection.find();
      const result2 = await allUsers.toArray();
      const filterUsers = result2.filter((item) =>
        allMembers.includes(item.uid)
      );
      res.send(filterUsers);
    });

    app.get("/users/filterGroupsUsers/:uid", async (req, res) => {
      const uid = req.params.uid;
      const query = req.query;

      const allFamilies = familyCollection.find();
      const result = await allFamilies.toArray();
      const filteredData = result.filter((item) => item.members.includes(uid));

      const allMembers = [];
      filteredData.map((data) => {
        data.members.map((member) => allMembers.push(member));
      });

      const allUsers = userCollection.find();
      const result2 = await allUsers.toArray();
      const allFamilyUsers = result2.filter((item) =>
        allMembers.includes(item.uid)
      );

      let allFamilyUsersFiltered;
      if (
        query.famName === "" &&
        query.bloodGroup === "" &&
        query.eligibility === ""
      ) {
        allFamilyUsersFiltered = allFamilyUsers;
      } else {
        allFamilyUsersFiltered = allFamilyUsers.filter((user) => {
          if (
            query.famName !== "" &&
            query.bloodGroup !== "" &&
            query.eligibility !== ""
          ) {
            return (
              user.familyGroups.includes(query.famName) &&
              user.bloodGroup === query.bloodGroup &&
              (user.eligibility.auto === query.eligibility ||
                user.eligibility.userGiven === query.eligibility)
            );
          } else if (
            query.famName === "" &&
            query.bloodGroup !== "" &&
            query.eligibility !== ""
          ) {
            return (
              user.bloodGroup === query.bloodGroup &&
              (user.eligibility.auto === query.eligibility ||
                user.eligibility.userGiven === query.eligibility)
            );
          } else if (
            query.famName !== "" &&
            query.bloodGroup === "" &&
            query.eligibility !== ""
          ) {
            return (
              user.familyGroups.includes(query.famName) &&
              (user.eligibility.auto === query.eligibility ||
                user.eligibility.userGiven === query.eligibility)
            );
          } else if (
            query.famName !== "" &&
            query.bloodGroup !== "" &&
            query.eligibility === ""
          ) {
            return (
              user.familyGroups.includes(query.famName) &&
              user.bloodGroup === query.bloodGroup
            );
          } else if (
            query.famName === "" &&
            query.bloodGroup === "" &&
            query.eligibility !== ""
          ) {
            return (
              user.eligibility.auto === query.eligibility ||
              user.eligibility.userGiven === query.eligibility
            );
          } else if (
            query.famName === "" &&
            query.bloodGroup !== "" &&
            query.eligibility === ""
          ) {
            return user.bloodGroup === query.bloodGroup;
          } else if (
            query.famName !== "" &&
            query.bloodGroup === "" &&
            query.eligibility === ""
          ) {
            return user.familyGroups.includes(query.famName);
          }
        });
      }

      res.send(allFamilyUsersFiltered);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.put("/users/groupUpdateOne/:uid", async (req, res) => {
      const uid = req.params.uid;
      const filter = { uid: uid };
      const group = req.body;
      const updatedUser = {
        $addToSet: {
          familyGroups: group.newGroup,
        },
      };
      const result = await userCollection.updateOne(filter, updatedUser);
      res.send(result);
    });

    app.put("/users/groupUpdateMany/:uid", async (req, res) => {
      const uid = req.params.uid;
      const filter = { uid: uid };
      const invites = req.body;
      const groups = [];
      invites.map((inv) => groups.push(inv.familyId));
      const updatedUser = {
        $addToSet: {
          familyGroups: { $each: groups },
        },
      };
      const result = await userCollection.updateOne(filter, updatedUser);
      res.send(result);
    });

    app.put("/users/profile/:uid", async (req, res) => {
      const uid = req.params.uid;
      const filter = { uid: uid };
      const user = req.body;

      if (
        user.diseases.length === 1 &&
        user.diseases[0].inputValueName === ""
      ) {
        user.diseases.pop();
      } else if (user.diseases.length > 1) {
        const newValues = [];
        user.diseases.map((disease) => {
          disease.inputValueName !== "" && newValues.push(disease);
        });
        user.diseases = newValues;
      }

      const updatedUser = {
        $set: {
          name: user.name,
          email: user.email,
          contact: user.contact,
          address: user.address,
          password: user.password,
          dob: user.dob,
          weight: user.weight,
          gender: user.gender,
          bloodGroup: user.bloodGroup,
          noOfDonation: user.noOfDonation,
          lastDonationDate: user.lastDonationDate,
          eligibility: user.eligibility,
          diseases: user.diseases,
        },
      };
      const result = await userCollection.updateOne(filter, updatedUser);
      res.send(result);
    });

    app.put("/users/groupDelete/:uid", async (req, res) => {
      const uid = req.params.uid;
      const filter = { uid: uid };
      const group = req.body;
      const updatedUser = {
        $pull: {
          familyGroups: group.deleteGroup,
        },
      };
      const result = await userCollection.updateOne(filter, updatedUser);
      res.send(result);
    });

    // ----------queries of families collection-----------------

    app.get("/families/:uid", async (req, res) => {
      const uid = req.params.uid;
      const cursor = familyCollection.find();
      const result = await cursor.toArray();
      const filteredData = result.filter((item) => item.members.includes(uid));
      res.send(filteredData);
    });

    app.post("/families", async (req, res) => {
      const family = req.body;
      const result = await familyCollection.insertOne(family);
      res.send(result);
    });

    app.put("/families/:uid", async (req, res) => {
      const uid = req.params.uid;
      const invites = req.body;
      const families = [];
      invites.map((inv) => families.push(inv.familyId));

      families.map(async (family) => {
        const filter = { _id: new ObjectId(family) };
        const updatedMembers = {
          $addToSet: {
            members: uid,
          },
        };
        const result = await familyCollection.updateOne(filter, updatedMembers);
        res.send(result);
      });
    });

    app.put("/families/memberDelete/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const member = req.body;
      const updatedMember = {
        $pull: {
          members: member.deleteMember,
        },
      };
      const result = await familyCollection.updateOne(filter, updatedMember);
      res.send(result);
    });

    // ----------queries of invites collection-----------------

    app.get("/invites/:emain", async (req, res) => {
      const emain = req.params.emain;
      const cursor = inviteCollection.find();
      const result = await cursor.toArray();
      const filteredData = result.filter((item) =>
        item.toEmail.includes(emain)
      );
      res.send(filteredData);
    });

    app.post("/invites", async (req, res) => {
      const invite = req.body;
      const result = await inviteCollection.insertOne(invite);
      res.send(result);
    });

    app.delete("/invites", async (req, res) => {
      const invites = req.body;
      const inviteIds = [];
      invites.map((inv) => inviteIds.push(inv._id));
      inviteIds.map(async (inv) => {
        const filter = { _id: new ObjectId(inv) };
        const result = await inviteCollection.deleteOne(filter);
        res.send(result);
      });
    });

    // ----------queries of messages collection-----------------

    app.get("/messages/:uid", async (req, res) => {
      const uid = req.params.uid;
      const allFamilies = familyCollection.find();
      const result = await allFamilies.toArray();
      const filteredData = result.filter((item) => item.members.includes(uid));

      const allMembers = [];
      filteredData.map((data) => {
        data.members.map((member) => allMembers.push(member));
      });

      const allUsers = userCollection.find();
      const result2 = await allUsers.toArray();
      const filterUsers = result2.filter((item) =>
        allMembers.includes(item.uid)
      );
      const usersMessages = [];
      filterUsers.map((res) => usersMessages.push(res.uid));

      const allMessages = messageCollection.find();
      const result3 = await allMessages.toArray();
      const filteredMessages = result3.filter((item) =>
        usersMessages.includes(item.member.id)
      );
      res.send(filteredMessages);
    });

    app.post("/messages", async (req, res) => {
      const message = req.body;
      const result = await messageCollection.insertOne(message);
      res.send(result);
    });

    app.delete("/messages", async (req, res) => {
      const message = req.body;
      const filter = { _id: new ObjectId(message.deleteId) };
      const result = await messageCollection.deleteOne(filter);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);
/* mongodb end */

app.get("/", (req, res) => {
  res.send("Welcome to FamiPlasma");
});

app.listen(port, () => {
  console.log(`FamiPlasma is running on port ${port}`);
});
