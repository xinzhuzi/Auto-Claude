"""
AI Prompts for Workflow Generation
===================================

Prompt templates for AI-powered workflow generation, optimization, and skill creation.
"""

# Workflow Schema for AI reference
WORKFLOW_SCHEMA = """
{
  "id": "string (UUID)",
  "name": "string",
  "description": "string",
  "nodes": [
    {
      "id": "string (UUID)",
      "type": "start|end|mcp|skill|subAgent|prompt|ifElse|switch|askUserQuestion|branch",
      "position": {"x": number, "y": number},
      "data": {
        // Node-specific data based on type
      }
    }
  ],
  "edges": [
    {
      "id": "string (UUID)",
      "source": "string (node ID)",
      "target": "string (node ID)",
      "sourceHandle": "string (optional)",
      "targetHandle": "string (optional)"
    }
  ],
  "variables": {
    "key": "value"
  }
}
"""

# Node Types Reference
NODE_TYPES_REFERENCE = """
Available Node Types:

1. **start** - Workflow entry point
   - No configuration needed
   - Must have exactly one per workflow

2. **end** - Workflow exit point
   - No configuration needed
   - Can have multiple per workflow

3. **mcp** - Call MCP tool
   - data.server: MCP server name
   - data.tool: Tool name
   - data.parameters: Tool parameters (object)

4. **skill** - Execute Claude skill
   - data.skillName: Skill name
   - data.prompt: Prompt for skill execution
   - data.model: Model to use (optional)

5. **subAgent** - Launch subagent
   - data.agentName: Subagent name
   - data.prompt: Task prompt
   - data.description: Task description
   - data.model: Model to use (optional)
   - data.timeout: Timeout in seconds (optional)

6. **prompt** - Send prompt to Claude
   - data.prompt: Prompt text
   - data.model: Model to use (optional)

7. **ifElse** - Conditional branching
   - data.condition: Condition expression
   - data.trueBranch: Branch name for true
   - data.falseBranch: Branch name for false

8. **switch** - Multi-way branching
   - data.expression: Expression to evaluate
   - data.cases: Array of {value, branch}

9. **askUserQuestion** - Request user input
   - data.question: Question text
   - data.options: Array of options (optional)
   - data.multiSelect: Allow multiple selections (boolean)
   - data.timeout: Timeout in seconds (optional)

10. **branch** - Fan-out to multiple paths
    - data.branches: Array of branch names
"""

# Workflow Generation Prompt
WORKFLOW_GENERATION_PROMPT = """You are an expert workflow designer for Auto-Claude, a powerful automation platform.

Your task is to generate a complete, valid workflow JSON based on the user's natural language description.

## Workflow Schema
{schema}

## Available Node Types
{node_types}

## User Description
{description}

## Additional Context
{context}

## Instructions
1. Analyze the user's description carefully
2. Identify the key steps and their dependencies
3. Choose appropriate node types for each step
4. Create a logical flow with proper connections
5. Add meaningful names and descriptions
6. Include error handling where appropriate
7. Use variables for reusable values

## Output Format
Generate a valid JSON workflow that follows the schema exactly.
Include:
- A descriptive workflow name and description
- All necessary nodes with proper configuration
- Edges connecting nodes in logical order
- Any workflow variables needed

Return ONLY the JSON, no additional text or explanation.
"""

# Workflow Optimization Prompt
WORKFLOW_OPTIMIZATION_PROMPT = """You are an expert workflow optimizer for Auto-Claude.

Your task is to analyze and improve an existing workflow based on user feedback.

## Current Workflow
{workflow}

## User Request
{optimization_request}

## Conversation History
{conversation_history}

## Instructions
1. Understand the user's optimization request
2. Analyze the current workflow structure
3. Identify areas for improvement
4. Propose specific changes
5. Explain the rationale for each change

## Optimization Strategies
- **Performance**: Parallelize independent tasks, reduce redundant operations
- **Reliability**: Add error handling, timeouts, retries
- **Clarity**: Improve naming, add descriptions, simplify complex logic
- **Maintainability**: Extract reusable patterns, reduce coupling

## Output Format
Provide:
1. A summary of proposed changes
2. The updated workflow JSON
3. Explanation of improvements

Format as JSON:
{
  "summary": "Brief description of changes",
  "workflow": { /* updated workflow JSON */ },
  "improvements": [
    {
      "type": "performance|reliability|clarity|maintainability",
      "description": "What was improved and why"
    }
  ]
}
"""

# Skill Generation Prompt
SKILL_GENERATION_PROMPT = """You are an expert at creating Claude skills for Auto-Claude.

Your task is to generate a skill definition in Markdown format based on the user's description.

## Skill Description
{description}

## Skill Name
{skill_name}

## Instructions
1. Understand the skill's purpose and use cases
2. Define clear triggerns
3. Write comprehensive instructions
4. Include examples and best practices
5. Specify required tools and permissions

## Skill Markdown Format
```markdown
# {skill_name}

## Description
[Brief description of what this skill does]

## When to Use
[Specific scenarios when this skill should be invoked]

## Instructions
[Detailed step-by-step instructions for the AI]

## Examples
[Example usage scenarios]

## Tools Required
[List of MCP tools or other dependencies]

## Best Practices
[Tips for effective use]
```

## Output
Generate a complete skill definition in Markdown format.
""

# Workflow Validation Prompt
WORKFLOW_VALIDATION_PROMPT = """You are a workflow validator for Auto-Claude.

Analyze this workflow and identify any issues or potential improvements.

## Workflow
{workflow}

## Validation Checks
1. **Structure**: Valid JSON, all required fields present
2. **Nodes**: All node types valid, proper configuration
3. **Edges**: All connections valid, no orphaned nodes
4. **Logic**: No infinite loops, proper branching
5. **Best Practices**: Naming conventions, error handling

## Output Format
{
  "valid": boolean,
  "errors": [
    {
      "severity": "error|warning|info",
      "message": "Description of issue",
      "location": "Node/edge ID or path"
    }
  ],
  "suggestions": [
    {
      "type": "performance|reliability|clarity",
      "message": "Improvement suggestion"
    }
  ]
}
"""


def format_workflow_generation_prompt(
    description: str,
    context: str = "",
) -> str:
    """
    Format workflow generation prompt with user description.

    Args:
        description: User's natural language description
        context: Additional context (optional)

    Returns:
        Formatted prompt string
    """
    return WORKFLOW_GENERATION_PROMPT.format(
        schema=WORKFLOW_SCHEMA,
        node_types=NODE_TYPES_REFERENCE,
        description=description,
        context=context or "No additional context provided.",
    )


def format_workflow_optimization_prompt(
    workflow: dict,
    optimization_request: str,
    conversation_history: list = None,
) -> str:
    """
    Format workflow optimization prompt.

    Args:
        workflow: Current workflow JSON
        optimization_request: User's optimization request
        conversation_history: Previous conversation messages

    Returns:
        Formatted prompt string
    """
    import json

    history_text = ""
    if conversation_history:
        history_text = "\n".join(
            f"- {msg.get('role', 'user')}: {msg.get('content', '')}"
            for msg in conversation_history
        )
    else:
        history_text = "No previous conversation."

    return WORKFLOW_OPTIMIZATION_PROMPT.format(
        workflow=json.dumps(workflow, indent=2),
        option_request=optimization_request,
        conversation_history=history_text,
    )


def format_skill_generation_prompt(
    description: str,
    skill_name: str,
) -> str:
    """
    Format skill generation prompt.

    Args:
        description: Skill description
        skill_name: Name for the skill

    Returns:
        Formatted prompt string
    """
    return SKILL_GENERATION_PROMPT.format(
        description=description,
        skill_name=skill_name,
    )


def format_workflow_validation_prompt(workflow: dict) -> str:
    """
    Format workflow validation prompt.

    Args:
  ow: Workflow JSON to validate

    Returns:
        Formatted prompt string
    """
    import json

    return WORKFLOW_VALIDATION_PROMPT.format(
        workflow=json.dumps(workflow, indent=2)
    )
