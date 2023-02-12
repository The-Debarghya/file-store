const router = require('express').Router();
const passport = require('passport');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const connection = require('../config/database');
const User = connection.models.User;

function isAuth(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(401).render('error', {data: { errorType: 'You are not authorized to view this resource' }});
    }
}

function sessionExists(req,res,next) {
    if(!req.session.data) {
        return res.redirect("/"); 
    } else {
      next();
    }
}

function hashUser(username) {
    const hash = crypto.createHash('sha256').update(username).digest('hex');
    return hash;
}

function genPassword(password) {
    var salt = crypto.randomBytes(32).toString('hex');
    var genHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    return {
      salt: salt,
      hash: genHash
    };
}

router.post('/login', passport.authenticate('local', { failureRedirect: '/login-failure', successRedirect: 'login-success' }));

router.post('/register', async (req, res, next) => {
    const saltHash = genPassword(req.body.pw);    
    const salt = saltHash.salt;
    const hash = saltHash.hash;
    const foldername = hashUser(req.body.uname).slice(0, 7);
    const newUser = new User({
        username: req.body.uname,
        hash: hash,
        salt: salt,
        folder: foldername,
    });
    const fullPath = __dirname + '/../uploads/' + foldername;
    try {
        await fs.promises.mkdir(fullPath);
    } catch (err) {
        if(err.code === 'EEXIST'){
            res.status(409).render('error', {data: {errorType: `Username already exists`}});
            return next(err);
        } else {
            res.status(500).render('error', {data: {errorType: 'Error while creating directory'}});
            return next(err);
        }
    }
    newUser.save()
        .then((user) => {
           // console.log(user);
        });
    res.set("Content-Security-Policy", "script-src 'sha256-HKHu8KzWy+uFQ5xdfwaa0tCXOadFl9TeeAR/XBFTSbw='")
    res.render('success', {message: 'Registered Successfully!', redirect: '/login'});
});

const upload = multer({
    storage: multer.diskStorage({
        destination: async (req, file, callback) => {
            const user = await User.findById(req.session.passport.user);
            callback(null, __dirname + `/../uploads/${user.folder}`);
        },
        filename: (req, file, callback) => {
            callback(null, file.originalname);
        }
    }),
    fileFilter: async (req, file, callback) => {
        try {
            const ext = path.extname(file.originalname);
            if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.gif' && ext !== '.txt' && ext !== '.pdf') {
                return callback(new Error('Only image, pdf and txt files are allowed.'));
            }
            const mime = file.mimetype;
            if(mime !== 'image/jpeg' && mime !== 'text/plain' && mime !== 'image/png' && mime !== 'image/gif' && mime !== 'application/pdf') {
                return callback(new Error('Only image, pdf and text mimetypes are allowed.'));
            }
            callback(null, true);
        } catch (error) {
            return res.status(400).render('error', {data: {errorType: err.message}})
        }
    },
    limits: {
        fileSize: 20 * 1024 * 1024 // 20 MiB
    }
});

router.post('/upload', isAuth, upload.single('uploaded_file'), async (req, res, next) => {
    const user = await User.findById(req.session.passport.user);
    if (!user) {
        return res.status(404).render('error', {data: {errorType: "User not found"}});
    }
    res.set("Content-Security-Policy", "script-src 'sha256-MSnSmGZTR0J+A2zO+oWr29zXYQp+frnwJyJJwQgaJkM='")
    res.render('success', {message: 'Uploaded Successfully!', redirect: '/dashboard'});
});

router.post('/addtext', isAuth, async (req, res, next) => {
    const user = await User.findById(req.session.passport.user);
    const dir = __dirname + '/../uploads/' + user.folder + '/';
    if (! /.*\.txt$/.test(req.body.filename)) {
        return res.status(400).render('error', {data: {errorType: "Invalid FileName"}})
    }
    fs.writeFile(dir + req.body.filename, req.body.data, (err) => {
        if (err !== null) {
            return res.status(500).render('error', {data: {errorType: err.message}})
        } else {
            res.set("Content-Security-Policy", "script-src 'sha256-MSnSmGZTR0J+A2zO+oWr29zXYQp+frnwJyJJwQgaJkM='")
            res.render('success', {message: 'Uploaded Successfully!', redirect: '/dashboard'});
        }
    })
})

router.get('/', (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('dashboard');
    }
    res.render('home');
});

router.get('/login', (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('dashboard');
    }
    res.render('login');
});

router.get('/register', (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('dashboard');
    }
    res.render('register');
});

router.get('/dashboard',isAuth, async (req, res, next) => {
    const user = await User.findById(req.session.passport.user);
    res.render('dashboard', {user: user.username});
});

router.get('/logout',isAuth, (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy((err) => {
            console.error(err.message);
            return next(err);
        });
        res.set("Content-Security-Policy", "script-src 'sha256-Qx9mL2K9oky7Tu8gS1KRgL3vhyhzv1Ixi3oXyswWXAw='")
        res.render('success', {message: 'Logged-out Successfully!', redirect: '/'});
    });
    
});

router.get('/login-success',isAuth, (req, res, next) => {
    res.set("Content-Security-Policy", "script-src 'sha256-MSnSmGZTR0J+A2zO+oWr29zXYQp+frnwJyJJwQgaJkM='")
    res.render('success', {message: 'Logged-in Successfully!', redirect: '/dashboard'});
});

router.get('/login-failure', (req, res, next) => {
    res.render('error', {data: {errorType: "Incorrect Username/Password"}});
});

router.get('/upload',isAuth, (req, res, next) => {
    res.render('upload');
});

router.get('/files',isAuth, async (req, res, next) => {
    const user = await User.findById(req.session.passport.user);
    var fileNames = [];
    var ownFileNames = [];
    if (user.username === 'admin') {
        ownFileNames = await fs.promises.readdir(__dirname + '/../uploads/' + user.folder)
        const dirNames = await fs.promises.readdir(__dirname + '/../uploads/');
        for (let i = 0; i < dirNames.length; i++) {
            const files = fs.readdirSync(__dirname + '/../uploads/' + dirNames[i]);
            fileNames.push(...files)              
       }
    } else {
       fileNames = await fs.promises.readdir(__dirname + '/../uploads/' + user.folder);
       ownFileNames = fileNames;
    }
    res.render('files', {fileNames: fileNames, user: user.username, ownFileNames: ownFileNames});
});

router.get('/view/:fileName',isAuth, async (req, res) => {
    const user = await User.findById(req.session.passport.user);
    const root = path.resolve(__dirname + "/../");
    let content;
    let foldername;
    try {
        if (user.username === 'admin') {
            const dirNames = await fs.promises.readdir(root + '/uploads/')
            for (let i = 0; i < dirNames.length; i++) {
                const filePath = root + '/uploads/' + dirNames[i] + '/' + req.params.fileName.slice(1);
                if (fs.existsSync(filePath)) {
                    if (req.params.fileName.endsWith(".txt")) {
                        content = fs.readFileSync(filePath)
                    } else if(req.params.fileName.endsWith(".pdf")) {
                        content = ""
                        foldername = dirNames[i]
                    } else {
                        content = fs.readFileSync(filePath)
                        const base64enc = Buffer.from(content).toString('base64');
                        content = base64enc;
                    }
                    break
                }                
            }
        } else {
            if (req.params.fileName.endsWith(".txt")) {
                content = fs.readFileSync(root + '/uploads/'+ user.folder + "/" + req.params.fileName.slice(1))
            } else if(req.params.fileName.endsWith(".pdf")) {
                content = ""
            } else {
                content = fs.readFileSync(root + '/uploads/'+ user.folder + "/" + req.params.fileName.slice(1))
                const base64enc = Buffer.from(content).toString('base64');
                content = base64enc;
            }
            foldername = user.folder
        }
        res.set("Content-Security-Policy", "pdf-src 'self'")
        res.render('view', {content: content, fileName: req.params.fileName.slice(1), user: user.username, folder: foldername})
    } catch (error) {
        res.render('error', {data: {errorType: "No such file or directory!"}});
    }
})

router.get('/download/:fileName',isAuth, async (req, res, next) => {
    const user = await User.findById(req.session.passport.user);
    var fileToDownload;
    if (user.username === 'admin') {
        const dirNames = await fs.promises.readdir(root + '/uploads/')
        for (let i = 0; i < dirNames.length; i++) {
            const filePath = root + '/uploads/' + dirNames[i] + '/' + req.params.fileName.slice(1);
            if (fs.existsSync(filePath)) {
                fileToDownload = filePath
                break
            }                
        }
    } else {
        fileToDownload = path.resolve(__dirname + "/../") + '/uploads/'+ user.folder + "/" + req.params.fileName.slice(1);
    }
    res.download(fileToDownload, req.params.fileName.slice(1), (err) => {
        if(err) {
            return next(err);
        }
    })
})

router.get('/removefile/:fileName', isAuth, async (req, res) => {
    const user = await User.findById(req.session.passport.user);
    var fileToDelete = path.resolve(__dirname + '/../') + '/uploads/' + user.folder + '/' + req.params.fileName.slice(1);
    fs.rmSync(fileToDelete);
    res.set("Content-Security-Policy", "script-src 'sha256-MSnSmGZTR0J+A2zO+oWr29zXYQp+frnwJyJJwQgaJkM='")
    res.render('success', {message: 'Deletion Successful!', redirect: '/dashboard'});
})

router.get('/removefile', isAuth, (req, res) => {
    res.render('error', {data: {errorType: "Blank File Name"}})
})

router.get('/addtext', isAuth, (req, res) => {
    res.render('addtext')
})

router.get('/view',isAuth, (req, res) => {
    res.render('error', {data: {errorType: "Blank File Name"}})
})

router.get('/download',isAuth, (req, res) => {
    res.render('error', {data: {errorType: "Blank File Name"}})
})

router.post('/delete',isAuth, async (req, res, next) => {
    const user = await User.findById(req.session.passport.user);
    User.deleteOne({username: user.username})
        .then(() => {
            const dir = path.resolve(__dirname + "/../") + '/uploads/'+ user.folder
            fs.rmSync(dir, {recursive: true, force:true})
            res.set("Content-Security-Policy", "script-src 'sha256-HKHu8KzWy+uFQ5xdfwaa0tCXOadFl9TeeAR/XBFTSbw='")
            res.render('success', {message: 'Account Deleted Successfully!', redirect: '/login'});
        })
        .catch((err) => {
            res.status(500).render('error', {data: {errorType: err.message}})
        })
})

module.exports = router;