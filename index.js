const express = require("express");
const fs = require("fs/promises");
const app = express();
const port = 3000;
var decompress = null;
const cors = require("cors");
const s3 = require("aws-sdk/clients/s3");
const multer = require("multer");
const path = require("path");
const storage = multer.diskStorage({
	destination: (req, res, cb) => {
		cb(null, "uploads");
	},
	filename: (req, file, cb) => {
		console.log(file);
		cb(null, Date.now() + path.extname(file.originalname));
	},
});
const upload = multer({ storage: storage });
require("dotenv").config();
require("aws-sdk/lib/maintenance_mode_message").suppress = true;

const upload_s3 = require('./js/upload_s3.js')

const {Client} = require('pg')
const client = new Client({
    user:process.env.rds_login,
    password:process.env.rds_pass,
    host:process.env.rds_host,
    port:process.env.rds_port,
    ssl:{
        rejectUnauthorized:false
    }
})

app.use(cors());
app.set("view engine", "ejs");
app.use(express.static("public"));

const aws = new s3({
	region: "sa-east-1",
	accessKeyId: process.env.s3_login,
	secretAccessKey: process.env.s3_pass,
});

app.get("/", (req, res) => {
	res.render("index");
	console.log("get /");
});
app.get("/imoveis.html", (req, res) => {
	res.render("imoveis");
	console.log("get /imoveis");
});
app.get("/faq.html", (req, res) => {
	res.render("faq");
	console.log("get /faq");
});
app.get("/contato.html", (req, res) => {
	res.render("contato");
	console.log("get /contato");
});
app.post("/new", upload.single("new_file"), async (req, res) => {
	// get list path of photos and csv from zip file
	if (decompress == null) {
		decompress = require("decompress");
	}
	var list_photos = [];
	var csvfile = "";
	await decompress(`./uploads/${req.file.filename}`, "./uploads/tmp")
		.then((files) => {
			for (var i of files) {
				var ext = i.path.split(".").pop();
				if (
					ext === "jpg" ||
					ext === "jpeg" ||
					ext === "bmp" ||
					ext === "png" ||
					ext === "webp"
				) {
					list_photos.push(i.path);
				} else if (ext === "csv") {
					csvfile = i.path;
				}
			}
		})
		.catch((err) => {
			console.error(err);
		});

    var photo_s3_path =[]
    for (var i of list_photos){
        var photo_path = await upload_s3.aws_bucket(aws,i)
        .then(res=>{
            return res
        })
        photo_s3_path.push(photo_path)
    }
    var csv_s3_path = await upload_s3.aws_bucket(aws, csvfile).then(res=>{return res})
    console.log(photo_s3_path)
    
    // TODO list de paths do s3, criar a pagina com template de imovel and da fetch das infos
    // TODO use sequelize em vez esse negocio tosco
    await client.connect()
    var res_sql = await client.query('create table if not exists imoveis(id text, photos text[])')
    console.log(res_sql)
    var res_sql = await client.query('insert into imoveis values ($1, $2)', )
    await client.end()

	await fs.unlink(`./uploads/${req.file.filename}`);
	// for (const file of await fs.readdir("./uploads/tmp")) {
	// 	await fs.unlink(path.join("./uploads/tmp", file));
	// }
	res.redirect("back");
});
app.listen(port, (req, res) => {
	console.log(`http://127.0.0.1:${port}`);
});
