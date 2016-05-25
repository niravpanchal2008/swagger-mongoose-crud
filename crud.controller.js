'use strict';

var _ = require('lodash');
var BaseController = require('./base.controller');
var params = require('./swagger.params.map');



/**
 * Constructor function for CrudController.
 * @classdesc Controller for basic CRUD operations on mongoose models.
 * Uses the passed id name as the request parameter id to identify models.
 * @constructor
 * @inherits BaseController
 * @param {Model} model - The mongoose model to operate on
 * @param {String} [idName] - The name of the id request parameter to use
 */
function CrudController(model,logger) {
    // call super constructor
    BaseController.call(this, this);

    // set the model instance to work on
    this.model = model;
    this.logger = logger;
    // set id name if defined, defaults to 'id'
    this.omit = [];
    _.bindAll(this);
}

CrudController.prototype = {

    /**
     * Set our own constructor property for instanceof checks
     * @private
     */
    constructor: CrudController,

    /**
     * The model instance to perform operations with
     * @type {MongooseModel}
     */
    model: null,

    /**
     * The id  parameter name
     * @type {String}
     * @default 'id'
     */
    idName: 'id',


    /**
     * Flag indicating whether the index query should be performed lean
     * @type {Boolean}
     * @default true
     */
    lean: true,

    /**
     * Array of fields passed to the select statement of the index query.
     * The array is joined with a whitespace before passed to the select
     * method of the controller model.
     * @type {Array}
     * @default The empty Array
     */
    select: [],

    /**
     * Array of fields that should be omitted from the query.
     * The property names are stripped from the query object.
     * @type {Array}
     * @default The empty Array
     */
    omit: [],

    /**
     * Name of the property (maybe a virtual) that should be returned
     * (send as response) by the methods.
     * @type {String}
     * @default The empty String
     */
    defaultReturn: '',

    /**
     * Default Data handlers for Okay Response
     * @type {function}
     * @default Okay response.
     */
    Okay: function (res, data) {
        res.status(200).json(data);  
    },
    /**
     * Default Data handlers for Okay Response
     * @type {function}
     * @default Okay response.
     */
    NotFound: function (res) {
        res.status(404).send();  
    },
    /**
     * Default Data handlers for Okay Response
     * @type {function}
     * @default Okay response.
     */
    Error: function (res,err) {
        res.status(400).send();  
    },
    /**
     * Get a count of results matching a particular filter criteria.
     * @param {IncomingMessage} req - The request message object
     * @param {ServerResponse} res - The outgoing response object the result is set to
     */
    _count: function (req, res) {
        var self = this;
        var reqParams = params.map(req);
        var filter = reqParams['filter'] ? reqParams.filter : {};
        if (this.omit.length > 0) {
            filter = _.omit(filter, this.omit);
        }  
        this.model.find(filter).count().exec().then(result => self.Okay(res,result),
        err => self.Error(res,err));
    },
    /**
     * Get a list of documents. If a request query is passed it is used as the
     * query object for the find method.
     * @param {IncomingMessage} req - The request message object
     * @param {ServerResponse} res - The outgoing response object the result is set to
     * @returns {ServerResponse} Array of all documents for the {@link CrudController#model} model
     * or the empty Array if no documents have been found
     */
    _index: function (req, res) {
        var reqParams = params.map(req);
        var filter = reqParams['filter'] ? reqParams.filter : {};
        var select = reqParams['select'] ? reqParams.select.split(',') : [];
        var page = reqParams['page'] ? reqParams.page : 1;
        var count = reqParams['count'] ? reqParams.count : 10;
        var skip = count * (page - 1);
        var self = this;
        if (typeof filter === 'string') {
            try {
                filter = JSON.parse(filter);
            } catch (err) {
                this.logger.error('Failed to parse filter :' + err);
                filter = {};
            }
        }

        if (this.omit.length) {
            filter = _.omit(filter, this.omit);
        }
        var query = this.model.find(filter);
        
        if (this.lean) {
            query.lean();
        }

        if (this.select.length || select.length) {
            var union = this.select.concat(select);
            query.select(union.join(' '));
        }
        query.skip(skip).limit(count);
        query.exec(function (err, documents) {
            if (err) {
                return self.Error(res,err);
            }
            return self.Okay(res,documents);
        });
    },

    /**
     * Get a single document. The requested document id is read from the request parameters
     * by using the {@link CrudController#idName} property.
     * @param {IncomingMessage} req - The request message object the id is read from
     * @param {ServerResponse} res - The outgoing response object
     * @returns {ServerResponse} A single document or NOT FOUND if no document has been found
     */
    _show: function (req, res) {
        var self = this;
        var reqParams = params.map(req);
        var select = reqParams['select']? reqParams.select.split(',') : []; //Comma seprated fileds list
        var query = this.model.findOne({ '_id': reqParams['id'] });
        if (select.length > 0) {
            query = query.select(select.join(' '));
        }
        query.exec().then((document) => {
            if (!document) {
                return self.NotFound(res);
            } else {
                return self.Okay(res, self.getResponseObject(document));    
            }
        }, err => self.Error(res, err));
    },

    /**
     * Creates a new document in the DB.
     * @param {IncomingMessage} req - The request message object containing the json document data
     * @param {ServerResponse} res - The outgoing response object
     * @returns {ServerResponse} The response status 201 CREATED or an error response
     */
    _create: function (req, res) {
        var self = this;
        //new this.model(req.body).save(function(Err,document){
        var payload = 'data';
        var body = params.map(req)[payload];
        this.model.create(body, function (err, document) {
            if (err) {
                return self.Error(res,err);
            }

            return self.Okay(res,self.getResponseObject(document));
        });
    },
    _bulkShow: function (req, res) {
        var reqParams = params.map(req);
        var ids = reqParams['id'].split(',');
        var select = reqParams['select'] ? reqParams.select.split(',') : null;
        var query = {
            '_id': { '$in': ids }
        };
        var self = this;
        var mq = this.model.find(query);
        if (select) {
            mq = mq.select(select.join(' '));
        }
        return mq.exec().then(result => self.Okay(res, result), err => this.Error(res, err));
    },
    _bulkUpdate: function (req,res) {
        var reqParams = params.map(req);
        var body = reqParams['data']; //Actual transformation
        var selectFields = Object.keys(body);
        var self = this;
        selectFields.push('_id');
        var ids = reqParams['id'].split(','); //Ids will be comma seperated ID list
        var promises = ids.map(id => this.model.findOneAndUpdate({ '_id': id }, body, { 'new': true }).select(body).exec());
        var promise = Promise.all(promises).then(result => res.json(result), err => {
            self.Error(res, err);
        });
        return promise;
    },
    /**
     * Updates an existing document in the DB. The requested document id is read from the
     * request parameters by using the {@link CrudController#idName} property.
     * @param {IncomingMessage} req - The request message object the id is read from
     * @param {ServerResponse} res - The outgoing response object
     * @params {String} in -  The Body payload location, if not specified, the parameter is assumed to be 'body'
     * @returns {ServerResponse} The updated document or NOT FOUND if no document has been found
     */
    _update: function (req, res) {
        var reqParams = params.map(req);
        var bodyIn = 'data';
        var body = reqParams[bodyIn];
  
        if (body._id) {
            delete req.body._id;
        }

        var self = this;
        var bodyData = _.omit(body, this.omit);

        this.model.findOne({ '_id': reqParams['id'] }, function (err, document) {
            if (err) {
                return self.Error(res,err);
            }

            if (!document) {
                return self.NotFound(res);
            }

            var updated = _.merge(document, bodyData);
            updated.save(function (err) {
                if (err) {
                    return self.Error(err);
                }

                return self.Okay(res,self.getResponseObject(document));
            });
        });
    },

    /**
     * Deletes a document from the DB. The requested document id is read from the
     * request parameters by using the {@link CrudController#idName} property.
     * @param {IncomingMessage} req - The request message object the id is read from
     * @param {ServerResponse} res - The outgoing response object
     * @returns {ServerResponse} A NO CONTENT response or NOT FOUND if no document has
     * been found for the given id
     */
    _destroy: function (req, res) {
        var reqParams = params.map(req);
        var self = this;
        this.model.findOne({ '_id': reqParams['id'] }, function (err, document) {
            if (err) {
                return self.Error(res,err);
            }

            if (!document) {
                return self.NotFound(res);
            }

            document.remove(function (err) {
                if (err) {
                    return self.Error(res,err);
                }

                return self.Okay(res,{});
            });
        });
    },

    _rucc: function (queryObject, callBack) {
        //rucc = Read Update Check Commit
        var self = this;
        return this.model.findOne({ _id: queryObject['id'] }).exec().then(result => {
            if (result) {
                var snapshot = result.toObject({ getters: false, virtuals: false, depopulate: true, });
                var newResult = callBack(result);
                if (newResult && typeof newResult.then === 'function') {
                    //newResult is a promise, resolve it and then update.
                    return newResult.then(res => { self.model.findOneAndUpdate(snapshot, res, { upsert: false, runValidators: true }) })
                        .exec()
                        .then(updated => {
                            if (!updated) {
                                self.__rucc(queryObject, callBack); //Re-do the transaction.
                            } else {
                                return updated;
                            }
                        });
                } else {
                    //newResult is a mongoose object
                    return self.model.findOneAndUpdate(snapshot, newResult, { upsert: false, runValidators: true })
                        .exec()
                        .then(updated => {
                            if (!updated) {
                                self.___rucc(queryObject, callBack);
                            } else {
                                return updated;
                            }
                        });
                }
            } else {
                return null;
            }

        });
    },
    
    getResponseObject: function (obj) {
        return this.defaultReturn && obj[this.defaultReturn] || obj;
    }
};

CrudController.prototype = _.create(BaseController.prototype, CrudController.prototype);

/**
 * The CrudController for basic CRUD functionality on Mongoose models
 * @type {CrudController}
 */
exports = module.exports = CrudController;