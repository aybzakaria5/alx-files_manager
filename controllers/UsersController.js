import sha1 from 'sha1';
import DBClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    const userExists = await DBClient.db.collection('users').findOne({ email });
    if (userExists) return res.status(400).send({ error: 'Already exist' });

    const hashedPassword = sha1(password);

    try {
      const user = await DBClient.db.collection('users').insertOne({
        email,
        password: hashedPassword,
      });

      return res.status(201).send({
        id: user.insertedId,
        email,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({ error: 'Server error' });
    }
  }
}

export default UsersController;
