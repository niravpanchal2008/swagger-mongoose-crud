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
function CrudController(model, idName) {
    // call super constructor
    BaseController.call(this, this);

    // set the model instance to work on
    this.model = model;

    // set id name if defined, defaults to 'id'
    if (idName) {
        this.idName = String(idName);
    }
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
     * Get a list of documents. If a request query is passed it is used as the
     * query object for the find method.
     * @param {IncomingMessage} req - The request message object
     * @param {ServerResponse} res - The outgoing response object the result is set to
     * @returns {ServerResponse} Array of all documents for the {@link CrudController#model} model
     * or the empty Array if no documents have been found
     */
    _index: function (req, res) {
        var query = params.map(req);
        var self = this;
        if (this.omit.length) {
            query = _.omit(query, this.omit);
        }

        query = this.model.find(query);

        if (this.lean) {
            query.lean();
        }

        if (this.select.length) {
            query.select(this.select.join(' '));
        }

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
        this.model.findOne({ '_id': reqParams[this.idName] }, function (err, document) {
            if (err) {
                return self.Error(res,err);
            }

            if (!document) {
                return self.NotFound(res);
            }

            return self.Okay(res,self.getResponseObject(document));
        });
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
        var body = params.map(req);
        this.model.create(body, function (err, document) {
            if (err) {
                return self.Error(res,err);
            }

            return self.Okay(res,self.getResponseObject(document));
        });
    },

    /**
     * Updates an existing document in the DB. The requested document id is read from the
     * request parameters by using the {@link CrudController#idName} property.
     * @param {IncomingMessage} req - The request message object the id is read from
     * @param {ServerResponse} res - The outgoing response object
     * @returns {ServerResponse} The updated document or NOT FOUND if no document has been found
     */
    _update: function (req, res) {
        var body = params.map(req);
  
        if (body._id) {
            delete req.body._id;
        }

        var self = this;
        var bodyData = _.omit(body, this.omit);

        this.model.findOne({ '_id': body[this.idName] }, function (err, document) {
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
        this.model.findOne({ '_id': reqParams[this.idName] }, function (err, document) {
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