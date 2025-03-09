import { ValidationController } from '../../../src/api/controllers/ValidationController.js';
import { ValidateKeyCommand } from '../../../src/core/keys/commands/ValidateKeyCommand.js';

// Simple test for validation controller
describe('ValidationController - Simple Test', () => {
  it('should create a controller successfully', () => {
    // Create mock dependencies
    const mockCommandBus = { execute: jest.fn() };
    
    // Create controller
    const controller = new ValidationController({
      services: {
        commandBus: mockCommandBus
      }
    });
    
    // Verify controller was created
    expect(controller).toBeInstanceOf(ValidationController);
  });
});