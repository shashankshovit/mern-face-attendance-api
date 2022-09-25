import express from 'express';
import fs from 'fs';
import cors from 'cors';
import https from 'https';
import multer from 'multer';
import helpers from './helpers';

const app = express();
app.use(cors());
app.use(multer({dest: 'uploads'}).array('userphotos'));
const port = process.env.PORT || 3001;

app.get('/', (req, res) => {
	res.send('Welcome to api');
});

app.post('/save-images', async (req, res)=> {
	!req.files && (req.files = []);
	(req.file && !req.files.length) && req.files.push(req.file);
	let cloudinaryImages;
	try {
		cloudinaryImages = await helpers.uploadFiles(req.files, {tags: req.body.name});
	} catch(e) {
		helpers.logError(e);
		res.json({success: false, server: 'cloudinary'});
		return;
	} finally {
		req.files.map(fl=>fs.unlink(fl.path, ()=>{}));
	}
	let success;
	try {
		const imagesSecureUrls = cloudinaryImages.map(img=>img.secure_url);
		const mongodbResponse = await helpers.saveImageUrls(req.body.name, imagesSecureUrls);
		success = mongodbResponse.acknowledged && mongodbResponse.insertedCount > 0;
	} catch(e) {
		helpers.logError(e);
		// MongoDB data write failed => Delete cloudinary uploaded images
		try {
			const imagesPublicIds = cloudinaryImages.map(img=>img.public_id);
			await helpers.deleteImages(imagesPublicIds);
		} catch(e) {
			helpers.logError(e);
		}
		res.json({success: false, server: 'mongodb'});
		return;
	}
	res.json({success});
});


app.get('/*', (req, res)=>{res.send("Face Attendance App: Unreachable Endpoint")});
https.createServer({
	key: fs.readFileSync('server.key'),
	cert: fs.readFileSync('server.cert')
}, app).listen(port, () => {
	console.log(`App starting at port ${port}.`);
});