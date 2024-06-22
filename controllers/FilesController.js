import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const statAsync = promisify(fs.stat);

class FilesController {
  // Handles file upload
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Validate user existence
    const user = await dbClient.users.findOne({ _id: new dbClient.ObjectID(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    // Basic validation for required fields
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });

    let parent = null;
    // Validate parent if provided
    if (parentId) {
      parent = await dbClient.files.findOne({ _id: new dbClient.ObjectID(parentId) });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    // Prepare new file object
    const newFile = {
      userId: new dbClient.ObjectID(userId),
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId ? new dbClient.ObjectID(parentId) : 0,
    };

    // Handle folder creation and file upload
    if (type === 'folder') {
      const result = await dbClient.files.insertOne(newFile);
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic: newFile.isPublic,
        parentId: newFile.parentId,
      });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    await mkdirAsync(folderPath, { recursive: true });

    const fileUUID = uuidv4();
    const filePath = path.join(folderPath, fileUUID);
    await writeFileAsync(filePath, Buffer.from(data, 'base64'));

    // Update newFile object with local path and insert into database
    newFile.localPath = filePath;
    const result = await dbClient.files.insertOne(newFile);
    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
      localPath: newFile.localPath,
    });
  }

  // Retrieves file details
  static async getShow(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.files.findOne({
      _id: new dbClient.ObjectID(fileId),
      userId: new dbClient.ObjectID(userId),
    });
    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.status(200).json(file);
  }

  // Retrieves list of files
  static async getIndex(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;
    const filesPerPage = 20;

    const query = {
      userId: new dbClient.ObjectID(userId),
      parentId: parentId === '0' ? 0 : new dbClient.ObjectID(parentId),
    };

    // Perform aggregation query to retrieve files
    const files = await dbClient.files.aggregate([
      { $match: query },
      { $skip: page * filesPerPage },
      { $limit: filesPerPage },
    ]).toArray();

    return res.status(200).json(files);
  }

  // Publishes a file
  static async putPublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.files.findOne({
      _id: new dbClient.ObjectID(fileId),
      userId: new dbClient.ObjectID(userId),
    });
    if (!file) return res.status(404).json({ error: 'Not found' });

    // Update file to be public
    await dbClient.files.updateOne(
      { _id: new dbClient.ObjectID(fileId) },
      { $set: { isPublic: true } },
    );

    file.isPublic = true;
    return res.status(200).json(file);
  }

  // Unpublishes a file
  static async putUnpublish(req, res) {
    const token = req.header('X-Token');
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.files.findOne({
      _id: new dbClient.ObjectID(fileId),
      userId: new dbClient.ObjectID(userId),
    });
    if (!file) return res.status(404).json({ error: 'Not found' });

    // Update file to be private
    await dbClient.files.updateOne(
      { _id: new dbClient.ObjectID(fileId) },
      { $set: { isPublic: false } },
    );

    file.isPublic = false;
    return res.status(200).json(file);
  }

  // Retrieves a file for download
  static async getFile(req, res) {
    const fileId = req.params.id;
    const { size } = req.query;

    const file = await dbClient.files.findOne({ _id: new dbClient.ObjectID(fileId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    // Validate file access based on public status or ownership
    if (!file.isPublic) {
      const token = req.header('X-Token');
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId || file.userId.toString() !== userId) return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') return res.status(400).json({ error: "A folder doesn't have content" });

    let filePath = file.localPath;
    if (size) filePath = `${filePath}_${size}`;

    try {
      await statAsync(filePath);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name) || 'application/octet-stream';
    return res.header('Content-Type', mimeType).sendFile(filePath);
  }
}

export default FilesController;
