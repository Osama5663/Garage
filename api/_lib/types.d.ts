

declare namespace Express {
    interface Request {
        file?: import('multer').File;
        files?: { [fieldname: string]: import('multer').File[] } | import('multer').File[];
    }
}
