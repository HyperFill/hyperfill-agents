from crewai import LLM
from .router import ModelRouter, ModelSize
from typing import Dict, Optional
import os

class CrewAIModelRouter:
    """
    CrewAI integration wrapper for the ModelRouter
    Provides LLM instances optimized for different agent types and tasks
    """
    
    def __init__(self):
        self.router = ModelRouter()
        self._llm_cache = {}
    
    def get_llm_for_agent(self, agent_type: str, task_description: str = "", context: str = None) -> LLM:
        """
        Get an optimized LLM instance for a specific agent and task
        
        Args:
            agent_type: Type of agent (pricer, market_analyzer, executive, inventory)
            task_description: Description of the task (optional, for optimization)
            context: Additional context (optional)
        
        Returns:
            Configured LLM instance
        """
        # Route the request
        config, classification = self.router.route_request(agent_type, task_description, context)
        
        # Create cache key
        cache_key = f"{classification.model_size.value}_{config['temperature']}"
        
        # Return cached LLM if available
        if cache_key in self._llm_cache:
            return self._llm_cache[cache_key]
        
        # Create new LLM instance
        llm = LLM(
            model=config["model"],
            temperature=config["temperature"],
            api_key=config["api_key"]
        )
        
        # Cache the LLM
        self._llm_cache[cache_key] = llm
        
        print(f"🤖 Router: {agent_type} → {'70B' if '70b' in config['model'] else '7B'} "
              f"(confidence: {classification.confidence:.2f}, complexity: {classification.task_complexity})")
        
        return llm
    
    def get_default_llm(self, agent_type: str) -> LLM:
        """Get default LLM for an agent type without task-specific optimization"""
        return self.get_llm_for_agent(agent_type, "")
    
    def get_pricing_llm(self, task_description: str = "") -> LLM:
        """Get LLM optimized for pricing tasks"""
        return self.get_llm_for_agent("pricer", task_description)
    
    def get_market_analyzer_llm(self, task_description: str = "") -> LLM:
        """Get LLM optimized for market analysis tasks"""  
        return self.get_llm_for_agent("market_analyzer", task_description)
    
    def get_executive_llm(self, task_description: str = "") -> LLM:
        """Get LLM optimized for executive coordination tasks"""
        return self.get_llm_for_agent("executive", task_description)
    
    def get_inventory_llm(self, task_description: str = "") -> LLM:
        """Get LLM optimized for inventory management tasks"""
        return self.get_llm_for_agent("inventory", task_description)
    
    def get_embedder_config(self, use_small_model: bool = True) -> Dict:
        """
        Get embedder configuration
        Use smaller model for embeddings to save tokens
        """
        model = ModelSize.SMALL.value if use_small_model else ModelSize.LARGE.value
        
        return {
            "provider": "groq", 
            "config": {
                "model": model,
                "api_key": self.router.groq_key
            }
        }
    
    def print_routing_stats(self):
        """Print routing statistics"""
        stats = self.router.get_usage_stats()
        print("\n=== Model Router Statistics ===")
        for key, value in stats.items():
            print(f"{key}: {value}")

# Convenience functions for easy integration
def create_router() -> CrewAIModelRouter:
    """Create a new CrewAI model router instance"""
    return CrewAIModelRouter()

def get_optimized_llm(agent_type: str, task: str = "") -> LLM:
    """Quick function to get optimized LLM for agent and task"""
    router = CrewAIModelRouter()
    return router.get_llm_for_agent(agent_type, task)