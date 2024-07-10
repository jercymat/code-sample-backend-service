const jobMetaSchema = {
  type: 'object',
  properties: {
    jobID: { type: 'number' },
    name: { type: 'string' },
    desc: { type: ['string', 'null'] },
    schedule: { type: ['string', 'null'] },
    scheduledTime: { type: ['string', 'null'] },
    avgTime: { type: 'number' },
    maxTime: { type: 'number' },
    triggerBy: { type: ['string', 'null'] },
    prereq: { type: ['string', 'null'] },
  },
  required: [
    'jobID',
    'name',
    'desc',
    'schedule',
    'scheduledTime',
    'avgTime',
    'maxTime',
    'triggerBy',
    'prereq',
  ],
};

const eventMetaSchema = {
  type: 'object',
  properties: {
    eventID: { type: 'number' },
    name: { type: 'string' },
    desc: { type: ['string', 'null'] },
    jobs: {
      type: 'array',
      items: jobMetaSchema,
    },
  },
  required: ['eventID', 'name', 'desc', 'jobs'],
};

const userMetaSchema = {
  type: 'object',
  properties: {
    userID: { type: 'number' },
    name: { type: 'string' },
    userPrincipal: { type: 'string' },
    admin: { type: 'boolean' },
    events: {
      type: 'array',
      items: eventMetaSchema,
    },
  },
  required: ['userID', 'name', 'userPrincipal', 'admin', 'events'],
};

const availableJobSchema = {
  type: 'object',
  properties: {
    eventID: { type: 'number' },
    name: { type: 'string' },
    jobs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          jobID: { type: 'number' },
          name: { type: 'string' },
        },
        required: ['jobID', 'name'],
      },
    },
  },
  required: ['eventID', 'name', 'jobs'],
};

const userAvailableSchema = {
  type: 'object',
  properties: {
    userID: { type: 'number' },
    name: { type: 'string' },
    userPrincipal: { type: 'string' },
    admin: { type: 'boolean' },
    availableJobs: {
      type: 'array',
      items: availableJobSchema,
    },
  },
  required: ['userID', 'name', 'userPrincipal', 'admin', 'availableJobs'],
};

const userProfilesSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      admin: { type: 'boolean' },
    },
    required: ['id', 'name', 'admin'],
  },
};

export default {
  subscribed: {
    user: userMetaSchema,
    event: eventMetaSchema,
    job: jobMetaSchema,
  },
  available: {
    user: userAvailableSchema,
    jobs: availableJobSchema,
  },
  profiles: userProfilesSchema,
};
