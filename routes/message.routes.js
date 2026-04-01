let express = require("express");
let router = express.Router();
let mongoose = require("mongoose");
let { CheckLogin } = require("../utils/authHandler");
let messageModel = require("../schemas/messages");

router.post("/", CheckLogin, async function (req, res, next) {
  try {
    let to = req.body.to;
    let text = req.body.text;
    let file = req.body.file;

    if (!to || !mongoose.Types.ObjectId.isValid(to)) {
      return res.status(400).send({ message: "to phai la user ID hop le" });
    }

    let hasFile = file !== undefined && file !== null && String(file).trim() !== "";
    if (hasFile) {
      let doc = await messageModel.create({
        from: req.user._id,
        to: to,
        messageContent: {
          type: "file",
          text: String(file).trim()
        }
      });
      return res.status(201).send(doc);
    }

    let textValue = text !== undefined && text !== null ? String(text) : "";
    let doc = await messageModel.create({
      from: req.user._id,
      to: to,
      messageContent: {
        type: "text",
        text: textValue
      }
    });
    return res.status(201).send(doc);
  } catch (err) {
    return res.status(400).send({ message: err.message });
  }
});

router.get("/", CheckLogin, async function (req, res, next) {
  try {
    let currentUserId = req.user._id;

    let pipeline = [
      {
        $match: {
          $or: [{ from: currentUserId }, { to: currentUserId }]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$from", currentUserId] }, "$to", "$from"]
          },
          latestMessage: { $first: "$$ROOT" }
        }
      },
      { $sort: { "latestMessage.createdAt": -1 } }
    ];

    let rows = await messageModel.aggregate(pipeline);
    let list = rows.map(function (row) {
      return row.latestMessage;
    });
    res.send(list);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.get("/:userID", CheckLogin, async function (req, res, next) {
  try {
    let userID = req.params.userID;
    if (!mongoose.Types.ObjectId.isValid(userID)) {
      return res.status(400).send({ message: "userID khong hop le" });
    }

    let currentUserId = req.user._id;
    let messages = await messageModel
      .find({
        $or: [
          { from: currentUserId, to: userID },
          { from: userID, to: currentUserId }
        ]
      })
      .sort({ createdAt: 1 })
      .lean();

    res.send(messages);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;
