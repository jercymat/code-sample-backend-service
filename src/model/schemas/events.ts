const eventSchema = {
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
      items: {
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
      },
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

const eventsSchema = {
  type: 'array',
  items: eventSchema,
};

const schedulesSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      eventID: { type: 'number' },
      eventName: { type: 'string' },
      jobID: { type: 'number' },
      jobName: { type: 'string' },
      scheduledTime: { type: 'string' },
      wave: { type: ['number', 'null'] },
    },
    required: [
      'eventID',
      'eventName',
      'jobID',
      'jobName',
      'scheduledTime',
      'wave',
    ],
  },
};

export default {
  event: eventSchema,
  events: eventsSchema,
  schedules: schedulesSchema,
};
