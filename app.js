import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import express from 'express'
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { body, validationResult } from 'express-validator'
import path from 'path'
var cors = require('cors');

process.on('uncaughtException', function (err) {
  console.error(err);
  console.log("Node NOT Exiting...");
});

app.use(
  cors({
    credentials: true,
    origin: true
  })
);
app.options('*', cors());

const __dirname = path.resolve(path.dirname(''));
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, '/')))

io.on("connection", (socket) => {
  socket.on('add_task', async (msg) => {
    const user = await RegistrationSchema.find();
    TaskSchema.find().then((data) => {
      io.emit('task_added', {
        id: msg,
        data,
        user
      });
    });
  });

  socket.on('add_comment', (msg) => {
    CommentSchema.find().then((data) => {
      io.emit('comment_added', {
        msg,
        data
      });
    });
  });
})

mongoose.connect('mongodb+srv://nugas:53mangat@cluster0.qnxrf.mongodb.net/nugas?retryWrites=true&w=majority',
  {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  },
)

var Schema = mongoose.Schema

var registrationSchema = new Schema({
  name: String,
  email: String,
  password: String,
  phoneNumber: String,
  id: String,
  connections: Array
})

var taskSchema = new Schema({
  id: String,
  title: String,
  description: String,
  maxTime: Date,
  name: String
},
  {
    timestamps: true
  }
)

var configSchema = new Schema({
  version: String,
  id: String
})

var commentSchema = new Schema({
  taskId: String,
  comment: String,
  commenter: String,
  userId: String
})

var RegistrationSchema = mongoose.model("registrations", registrationSchema)
var TaskSchema = mongoose.model("tasks", taskSchema)
var ConfigSchema = mongoose.model("configs", configSchema)
var CommentSchema = mongoose.model("comments", commentSchema)

app.post('/login', async (req, res) => {
  const email = await RegistrationSchema.findOne({ $or: [{ email: req.body.user }, { id: req.body.user }] })
  if (!email) {
    return res.status(404).json({ error: 'user atau password tidak valid' })
  }
  const match = bcrypt.compareSync(req.body.password, email.password)

  if (!match) {
    return res.status(400).json({ error: 'user atau password tidak valid' })
  }

  const user = {
    name: email.name,
    email: email.email,
    phoneNumber: email.phoneNumber,
    id: email.id
  }
  const result = jwt.sign(user, email.password, (error, token) => {
    if (error) {
      return { error: 'error ketika membuat token' }
    }
    res.json({
      token
    })
  })
  return result
})

app.post('/register',
  body('name').isString().isLength({ min: 1 }).withMessage('nama tidak boleh kosong'),
  body('email').isEmail().withMessage('email tidak valid'),
  body('password').isString().isLength({ min: 5 }).withMessage('password minimal 5 karakter'),
  body('phoneNumber').isMobilePhone().withMessage('nomor telepon minimal 6 karakter'),
  body('id').isString().isLength({ min: 1 }).withMessage('id tidak boleh kosong'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() })
    }
    const email = await RegistrationSchema.findOne({ email: req.body.email })
    const phoneNumber = await RegistrationSchema.findOne({ phoneNumber: req.body.phoneNumber })
    const id = await RegistrationSchema.findOne({ id: req.body.id })
    if (email) {
      return res.status(400).json({ error: 'email sudah terdaftar' })
    }
    if (phoneNumber) {
      return res.status(400).json({ error: 'Nomor telepon sudah terdaftar' })
    }
    if (id) {
      return res.status(400).json({ error: 'Id sudah terdaftar' })
    }
    const salt = bcrypt.genSaltSync(10)
    const password = bcrypt.hashSync(req.body.password, salt)
    var newRegistration = new RegistrationSchema({
      "name": req.body.name,
      "email": req.body.email,
      "password": password,
      "phoneNumber": req.body.phoneNumber,
      "id": req.body.id
    })

    newRegistration.save(function (error) {
      if (error)
        return res.send(error)

      const user = {
        name: req.body.name,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        id: req.body.id
      }
      const result = jwt.sign(user, req.body.password, (error, token) => {
        if (error) {
          return { error: 'error ketika membuat token' }
        }
        res.json({
          token
        })
      })
      return result
    })
  })

app.post('/add-task',
  body('id').isString().isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() })
    }
    const user = await RegistrationSchema.findOne(
      {
        id: req.body.id
      }
    )
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    var newTask = new TaskSchema({
      'id': req.body.id,
      'title': req.body.title,
      'description': req.body.description,
      'maxTime': req.body.maxTime,
      'name': user.name
    })

    newTask.save(function (error, data) {
      console.log(data);
      if (error)
        return res.send(error)

      return res.json({ 'data': true })
    });
  })

app.patch('/update-task',
  body('id').isString().isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() })
    }
    var newTask = {
      'id': req.body.id,
      'title': req.body.title,
      'description': req.body.description
    }
    console.log(newTask);
    const doc = await TaskSchema.findByIdAndUpdate(
      {
        _id: req.body.taskId
      },
      newTask,
      { new: true }
    )

    return res.json({ 'data': true })
  })

app.patch('/update-customer',
  async (req, res) => {
    console.log(req.query.method);
    if (req.query.method === 'delete') {
      await RegistrationSchema.updateOne(
        {
          id: req.body.id
        },
        {
          $pull: {
            connections: req.body.connections
          }
        },
      )
    } else {
      await RegistrationSchema.updateOne(
        {
          id: req.body.id
        },
        {
          $addToSet: {
            connections: req.body.connections
          }
        },
      )
    }

    const customer = await RegistrationSchema.findOne(
      {
        id: req.body.id
      }
    )
    const user = {
      name: customer.name,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      id: customer.id,
      connections: customer.connections
    }
    const result = jwt.sign(user, customer.password, (error, token) => {
      if (error) {
        return res.json({ error: 'error ketika membuat token' });
      }
      res.json({
        token
      });
    })
    return result
  })

app.delete('/delete-task',
  async (req, res) => {
    await TaskSchema.findByIdAndDelete(
      {
        _id: req.body.taskId
      }
    )

    return res.json({ 'data': true })
  })

app.delete('/delete-comment',
  async (req, res) => {
    await CommentSchema.findByIdAndDelete(
      {
        _id: req.body.commentId
      }
    )

    return res.json({ 'data': true })
  })

app.post('/add-comment',
  body('taskId').isString().isLength({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() })
    }
    const user = await RegistrationSchema.findOne({
      id: req.body.userId
    })
    console.log(user.name);
    var newComment = new CommentSchema({
      'taskId': req.body.taskId,
      'comment': req.body.comment,
      'commenter': user.name,
      'userId': user.id
    })

    newComment.save(function (error, data) {
      console.log(data);
      if (error)
        return res.send(error)

      return res.json({ 'data': true })
    });
  })

app.patch('/update-profile',
  async (req, res) => {
    const user = await RegistrationSchema.findOneAndUpdate(
      {
        id: req.body.id
      },
      {
        'name': req.body.name
      },
      { new: true },
    )
    await TaskSchema.updateMany(
      {
        id: req.body.id
      },
      {
        'name': req.body.name
      }
    )
    await CommentSchema.updateMany(
      {
        userId: req.body.id
      },
      {
        'commenter': req.body.name
      }
    )
    if (!user) {
      return res.status(404).json({ 'error': 'user not found' })
    }
    console.log(user);

    const updatedUser = {
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      id: user.id,
      connections: user.connections
    }
    const result = jwt.sign(updatedUser, user.password, (error, token) => {
      if (error) {
        return res.json({ error: 'error ketika membuat token' });
      }
      res.json({
        token
      });
    })
    return result
  })

app.patch('/change-password',
  body('password').isString().isLength({ min: 5 }).withMessage('password minimal 5 karakter'),
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() })
    }
    const user = await RegistrationSchema.findOne(
      {
        $and: [
          {
            id: req.body.id,
          },
          {
            email: req.body.email,
          },
          {
            phoneNumber: req.body.phoneNumber,
          }
        ]
      }
    )
    console.log(user);
    if (!user) {
      res.status(404).json({ error: 'user not found' })
    }
    const salt = bcrypt.genSaltSync(10)
    const password = bcrypt.hashSync(req.body.password, salt)

    await RegistrationSchema.findOneAndUpdate(
      {
        id: req.body.id,
      },
      {
        password: password
      },
      { new: true }
    )

    return res.json({ 'data': true })
  })

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
});

app.get('/config', async (req, res) => {
  const result = await ConfigSchema.findOne(
    { id: 'config' }
  )
  res.json(result)
});

http.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})