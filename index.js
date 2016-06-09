'use strict';
var mongoose = require('mongoose');
var ParamController = require('./param.controller');
var _ = require('lodash');
var log4js = require('log4js');
if(process.env.PROD_ENV){
    var logger = log4js.getLogger("swagger-mongoose-crud");   
} 
else{
    var logger = log4js.getLogger("swagger-mongoose-crud-dev");   
}

/**
 * Constructor function for MongooseModel
 * @classdesc Basic mongoose Model sytem
 * Uses the definition passed on the by the Input object for creating crud operations
 * @constructor
 * @inherits ParamController
 * @param {Object} schema  - Schema for mongoose object.
 * @param {String} collection - Collection to which data needs to be populated.
 */
function MongooseModel(schema,collection) {
    this.schema = schema;
    this.model = mongoose.model(collection, this.schema);
    ParamController.call(this, this.model, this.model.modelName,logger);
    this.index = this._index.bind(this);
    this.create = this._create.bind(this);
    this.show = this._show.bind(this);
    this.update = this._update.bind(this);
    this.destroy = this._destroy.bind(this);
    this.rucc = this._rucc.bind(this);
    this.count = this._count.bind(this);
    this.bulkUpdate = this._bulkUpdate.bind(this);
    this.bulkShow = this._bulkShow.bind(this);
    logger.trace('Initialised Mongoose Model');
}

MongooseModel.prototype = {
    constructor: MongooseModel,
    model: null,
    schema: null,
    definition: null
};

MongooseModel.prototype = _.create(ParamController.prototype,MongooseModel.prototype);
exports = module.exports = MongooseModel.bind(MongooseModel);
