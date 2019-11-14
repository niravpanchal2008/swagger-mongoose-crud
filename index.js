'use strict';
var mongoose = require('mongoose');
var ParamController = require('./param.controller');
var _ = require('lodash');
var log4js = require('log4js');
var logger = process.env.PROD_ENV ? log4js.getLogger('swagger-mongoose-crud') : log4js.getLogger('swagger-mongoose-crud-dev');
var logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
var params = require('./swagger.params.map');
var uniqueValidator = require('mongoose-unique-validator');
log4js.configure({
    levels: {
        AUDIT: { value: Number.MAX_VALUE - 1, colour: 'yellow' }
    },
    appenders: { out: { type: 'stdout', layout: { type: 'basic' } } },
    categories: { default: { appenders: ['out'], level: logLevel.toUpperCase() } }
});
/**
 * Constructor function for MongooseModel
 * @classdesc Basic mongoose Model sytem
 * Uses the definition passed on the by the Input object for creating crud operations
 * @constructor
 * @inherits ParamController
 * @param {Object} schema  - Schema for mongoose object.
 * @param {String} modelName - Model name to which data needs to be populated.
 * @param {Object} options - optional options object. Takes 2 values - logger and collectionName
 */

function MongooseModel(schema, modelName, options) {
    this.schema = injectDefaults(schema);
    logger = options.logger ? options.logger : logger;
    logger.level = logLevel;
    let defaultFilter = options.defaultFilter ? options.defaultFilter : {};
    schema.plugin(uniqueValidator);
    this.model = mongoose.model(modelName, this.schema, options.collectionName);
    ParamController.call(this, this.model, modelName, logger, defaultFilter);
    this.index = this._index.bind(this);
    this.create = this._create.bind(this);
    this.show = this._show.bind(this);
    this.update = this._update.bind(this);
    this.destroy = this._destroy.bind(this);
    this.rucc = this._rucc.bind(this);
    this.count = this._count.bind(this);
    this.bulkUpdate = this._bulkUpdate.bind(this);
    this.bulkUpload = this._bulkUpload.bind(this);
    this.bulkShow = this._bulkShow.bind(this);
    this.markAsDeleted = this._markAsDeleted.bind(this);
    this.bulkDestroy = this._bulkDestroy.bind(this);
    this.bulkMarkAsDeleted = this._bulkMarkAsDeleted.bind(this);
    logger.trace('Initialised Mongoose Model');
}

MongooseModel.prototype = {
    constructor: MongooseModel,
    model: null,
    schema: null,
    definition: null,
    swagMapper: params.map
};


function injectDefaults(schema) {
    schema.add({
        '_metadata.lastUpdated': {
            type: Date,
            default: Date.now
        },
        '_metadata.createdAt': {
            type: Date,
            default: Date.now
        },
        '_metadata.deleted': {
            type: Boolean,
            default: false
        },
        '_metadata.version.document': {
            type: 'Number',
            default: 0
        }

    })
    schema.index({
        '_metadata.lastUpdated': 1
    });
    schema.index({
        '_metadata.createdAt': 1
    });
    schema.index({
        '_metadata.deleted': 1
    });
    schema.pre('save', function (next) {
        if (this._metadata && this._metadata.version) this._metadata.version.document++;
        if (this._metadata) this._metadata.lastUpdated = new Date();
        next();
    });
    schema.pre('update', function (next) {
        if (this._metadata && this._metadata.version) this._metadata.version.document++;
        if (this._metadata) this._metadata.lastUpdated = new Date();
        next();
    });
    return schema;
}
MongooseModel.prototype = _.create(ParamController.prototype, MongooseModel.prototype);
exports = module.exports = MongooseModel.bind(MongooseModel);
