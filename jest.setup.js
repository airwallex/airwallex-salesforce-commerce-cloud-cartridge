/**
 * This file is used to setup the jest environment for the project.
 * It is used to mock the necessary modules for the project.
 */

// Mock modules that don't exist in node_modules (e.g., Salesforce Commerce Cloud server-side modules)
// These are handled via moduleNameMapper in jest.config.js pointing to __mocks__ directory
// If you need to enhance mocks with jest.fn() for spying, you can add jest.mock() calls here
