// Mock for dw/job/JobStepExecution
class JobStepExecution {
  constructor() {
    this.stepID = 'test-step';
    this.jobExecution = {
      jobID: 'test-job',
    };
  }

  getJobExecution() {
    return this.jobExecution;
  }

  getStepID() {
    return this.stepID;
  }
}

module.exports = JobStepExecution;
