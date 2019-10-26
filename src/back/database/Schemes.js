const mongoose = require('mongoose');
const { Schema } = require('mongoose');

const Logger = require('./../Logger');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/Starlight', { useNewUrlParser: true }).catch((e) => {
  Logger.error(`Failed to connect to the mongo, reason: ${e}`);
  process.exit(-1);
});

/**
 * The Mongoose scheme for a job
 */
const JobScheme = new Schema({
  Name: 'string',
  Level: 'string',
});

/**
 * The Mongoose scheme for a position
 */
const PositionSchema = new Schema({ x: 'number', y: 'number' });
/**
 * The Mongoose scheme for an inhabitant
 */
const InhabitantSchema = new Schema({
  Name: 'string',
  Description: 'string',
  Position: {
    type: PositionSchema,
  },
  Health: 'number',
  MaxHealth: 'number',
  items: ['string'],
  conditions: ['string'],
  jobs: [JobScheme],
});

/**
 * The Mongoose scheme for an equipement type
 */
const EquipementSchema = new Schema({
  imageUrl: 'string',
  desc: 'string',
  bonus: 'string',
  ability: 'string',
});

/**
 * The Mongoose scheme for a structure type
 */
const StructureSchema = new Schema({
  imageUrl: 'string',
  terrain: 'string',
  desc: 'string',
  health: 'number',
});

/**
 * The Mongoose model for a Turn
 */

const MagicSchema = new Schema({
  Name: 'string',
  Constelation: 'string',
  StarChart: { x: Number, y: Number },
  Spell: 'string',
  Levels: [{ Level: Number, Description: String }],
  OmCombo: String,

})
const StatusMongoose = mongoose.model('Status', {
  date: Date,
  Turn: String,
  Survivors: [InhabitantSchema],
  Craft: {
    equipements: [EquipementSchema],
    structures: [StructureSchema],
  },
  Magic: [MagicSchema],
});

module.exports = {
  PositionSchema,
  InhabitantSchema,
  EquipementSchema,
  StructureSchema,
  StatusMongoose,
  JobScheme,
};
