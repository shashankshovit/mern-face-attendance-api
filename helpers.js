import cloudinary from './config/cloudinary';
import {getMongodbClient, db} from './config/mongodb';

const folder = process.env.CLOUDINARY_FOLDER;

const helpers = {
	logError: (e) => {
		console.warn(`\n>>> ${e.name}: ${e.message}\n`);
	},
	uploadFiles: (files, options) => {
		// throws Error
		const transform = {width: 250, crop: 'limit'};
		const responses = files.map(file=>cloudinary.uploader.upload(file.path, {...options, folder, ...transform}));
		return Promise.all(responses);
	},
	saveImageUrls: (name, urls) => {
		// throws Error
		const client = getMongodbClient();
		try {
			return client.db(db).collection("user_images")
										.insertMany(urls.map(url=>{return {name, url}}));
		} finally {
			client.close();
		}
	},
	deleteImages: (publicIds) => {
		// throws Error
		return Promise.all(publicIds.map(publicId=>cloudinary.uploader.destroy(publicId, {invalidate: true})));
	}
};

module.exports = helpers;