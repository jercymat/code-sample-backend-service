const ongoingJobSchema = {
  type: 'object',
  properties: {
    jobID: { type: 'number' },
    ongoingJobID: { type: 'number' },
    name: { type: 'string' },
    desc: { type: ['string', 'null'] },
    scheduledTime: { type: 'string' },
    startTime: { type: 'string' },
    endTime: { type: ['string', 'null'] },
    avgTime: { type: 'number' },
    maxTime: { type: 'number' },
    status: { type: 'string' },
    triggerBy: { type: ['string', 'null'] },
  },
  required: [
    'jobID',
    'ongoingJobID',
    'name',
    'desc',
    'scheduledTime',
    'startTime',
    'endTime',
    'avgTime',
    'maxTime',
    'status',
    'triggerBy',
  ],
};

const ongoingEventSchema = {
  type: 'object',
  properties: {
    ongoingEventID: { type: 'number' },
    startTime: { type: 'string' },
    endTime: { type: ['string', 'null'] },
    jobs: {
      type: 'array',
      items: ongoingJobSchema,
    },
  },
  required: ['ongoingEventID', 'startTime', 'endTime', 'jobs'],
};

const eventListSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      eventID: { type: 'number' },
      name: { type: 'string' },
    },
    required: ['eventID', 'name'],
  },
};

const eventSchema = {
  type: 'object',
  properties: {
    eventID: { type: 'number' },
    name: { type: 'string' },
    desc: { type: ['string', 'null'] },
    history: {
      type: 'array',
      items: ongoingEventSchema,
    },
  },
  required: ['eventID', 'name', 'desc', 'history'],
};

const singleOngoingEventSchema = {
  type: 'object',
  properties: {
    eventID: { type: 'number' },
    ongoingEventID: { type: 'number' },
    name: { type: 'string' },
    desc: { type: ['string', 'null'] },
    startTime: { type: 'string' },
    endTime: { type: ['string', 'null'] },
    jobs: {
      type: 'array',
      items: ongoingJobSchema,
    },
  },
  required: [
    'eventID',
    'ongoingEventID',
    'name',
    'desc',
    'startTime',
    'endTime',
    'jobs',
  ],
};

export default {
  eventList: eventListSchema,
  event: eventSchema,
  singleOngoingEvent: singleOngoingEventSchema,
};
