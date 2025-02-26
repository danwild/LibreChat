const axios = require('axios');
const { Tool } = require('langchain/tools');

class IVCAPCrewsAPI extends Tool {
  constructor(fields) {
    super();
    this.name = 'ivcap-crews';
    this.apiToken = fields.IVCAP_JWT || this.getAPIToken();
    this.apiUrl = fields.IVCAP_API_URL || 'https://develop.ivcap.net';
    this.description = `
    Retrieves a list of IVCAP Research Assistant crews (i-crews). Use this tool when the user wants to find or learn about available research assistants in the IVCAP platform.
    The tool returns information about each crew, including their ID, name, description, capabilities.
    `;
  }

  getAPIToken() {
    const token = process.env.IVCAP_JWT || '';
    if (!token) {
      throw new Error('Missing IVCAP_JWT environment variable.');
    }
    return token;
  }

  async _call(input) {
    try {
      console.log('IVCAP tool called with input:', input);
      
      // Parse input if it's a string that might contain parameters
      let limit = 15;
      let filter = '';
      
      if (typeof input === 'string' && input.trim()) {
        try {
          const inputObj = JSON.parse(input);
          if (inputObj.limit) limit = inputObj.limit;
          if (inputObj.filter) filter = inputObj.filter;
        } catch (e) {
          // If not valid JSON, check if it's a simple filter string
          filter = input;
        }
      }
      
      let url = `${this.apiUrl}/1/aspects?schema=urn:sd:schema:icrew-crew.1&limit=${limit}&include-content=true`;
      
      console.log('IVCAP API URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${this.apiToken}`
        }
      });
      
      console.log('IVCAP API response status:', response.status);
      
      // Format the response data for better readability
      const crews = response.data.items || [];
      if (crews.length === 0) {
        return 'No research assistant crews found.';
      }

      let result = '### IVCAP Research Assistant Crews:\n\n';
      
      crews.forEach(crew => {
        const content = crew.content || {};
        result += `**${content.name || 'Unnamed Crew'}**\n`;
        result += `- ID: ${crew.id || 'N/A'}\n`;
        result += `- Entity: ${crew.entity || 'N/A'}\n`;
        result += `- Summary: ${content.summary || 'No summary available'}\n`;
        
        // Add placeholders information
        if (content.placeholders && content.placeholders.length > 0) {
          result += `- Placeholders: ${content.placeholders.join(', ')}\n`;
        }
        
        // Add process information
        if (content.process) {
          result += `- Process: ${content.process}\n`;
        }
        
        // Add agents information
        if (content.agents && Object.keys(content.agents).length > 0) {
          result += `- Agents (${Object.keys(content.agents).length}):\n`;
          Object.entries(content.agents).forEach(([agentName, agentDetails]) => {
            result += `  - ${agentDetails.role || agentName}: ${agentDetails.backstory ? agentDetails.backstory.substring(0, 100).trim() + '...' : 'No backstory'}\n`;
          });
        }
        
        // Add tasks information
        if (content.tasks && content.tasks.length > 0) {
          result += `- Tasks (${content.tasks.length}):\n`;
          content.tasks.slice(0, 3).forEach(task => {
            result += `  - ${task.name}: ${task.description ? task.description.substring(0, 100).trim() + '...' : 'No description'}\n`;
          });
          if (content.tasks.length > 3) {
            result += `  - ... and ${content.tasks.length - 3} more tasks\n`;
          }
        }
        
        result += '\n';
      });
      
      console.log('IVCAP tool returning result');
      return result;

    } catch (error) {
      console.error('Error querying IVCAP API:', error);
      if (error.response) {
        return `Error: ${error.response.status} - ${error.response.statusText}`;
      }
      return 'There was an error retrieving IVCAP research assistant crews.';
    }
  }
}

module.exports = IVCAPCrewsAPI; 