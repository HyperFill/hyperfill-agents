import re
import os
from typing import Dict, List, Tuple, Optional
from enum import Enum
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

class ModelSize(Enum):
    SMALL = "groq/llama-3.1-8b-instant" 
    LARGE = "groq/llama-3.3-70b-versatile"

@dataclass
class TaskClassification:
    agent_type: str
    task_complexity: str
    requires_reasoning: bool
    model_size: ModelSize
    confidence: float

class ModelRouter:
    """
    Production router that selects optimal model size based on task complexity
    Reduces token usage while maintaining performance
    """
    
    def __init__(self):
        self.groq_key = os.getenv("GROQ_API_KEY")
        
        # Real usage tracking
        self.usage_stats = {
            "total_requests": 0,
            "small_model_usage": 0,
            "large_model_usage": 0,
            "token_savings_estimate": 0
        }
        
        # Production routing rules for each agent type
        self.agent_rules = {
            "pricer": {
                "default_model": ModelSize.LARGE,
                "keywords_70b": ["pricing", "calculation", "arbitrage", "profit", "complex", "strategy", "analysis"],
                "keywords_7b": ["format", "display", "simple"]
            },
            "market_analyzer": {
                "default_model": ModelSize.SMALL,
                "keywords_70b": ["analyze", "predict", "complex analysis", "strategy", "reasoning"],
                "keywords_7b": ["fetch", "format", "json", "data", "translate", "parse", "convert"]
            },
            "executive": {
                "default_model": ModelSize.SMALL, 
                "keywords_70b": ["strategy", "complex decision", "analyze", "evaluate"],
                "keywords_7b": ["coordinate", "delegate", "status", "simple", "route", "manage"]
            },
            "inventory": {
                "default_model": ModelSize.SMALL,
                "keywords_70b": ["complex analysis", "strategy", "prediction"],
                "keywords_7b": ["balance", "update", "check", "simple", "rule", "threshold"]
            }
        }
        
        # Complexity indicators that always require 70B
        self.complexity_indicators = [
            "analyze complex", "strategic decision", "calculate profit", 
            "arbitrage opportunity", "risk assessment", "multi-step reasoning",
            "evaluate strategy", "complex analysis", "advanced calculation"
        ]
        
        # Simple task indicators that can use 7B
        self.simple_indicators = [
            "fetch data", "format json", "parse response", "convert format",
            "simple check", "status update", "basic coordination", "rule-based",
            "threshold check", "simple calculation"
        ]

    def classify_task(self, agent_type: str, task_description: str, context: Optional[str] = None) -> TaskClassification:
        """
        Classify a task to determine optimal model size
        
        Args:
            agent_type: The type of agent (pricer, market_analyzer, executive, inventory)
            task_description: Description of the task to be performed
            context: Additional context for the task
        
        Returns:
            TaskClassification with recommended model and confidence
        """
        agent_type = agent_type.lower().replace(" ", "_")
        
        # Get agent-specific rules
        rules = self.agent_rules.get(agent_type, {"default_model": ModelSize.LARGE})
        default_model = rules.get("default_model", ModelSize.LARGE)
        
        # Combine task description and context
        full_text = f"{task_description} {context or ''}".lower()
        
        # Check for complexity indicators
        complexity_score = 0
        reasoning_required = False
        
        # Global complexity check
        for indicator in self.complexity_indicators:
            if indicator in full_text:
                complexity_score += 2
                reasoning_required = True
        
        # Global simplicity check  
        for indicator in self.simple_indicators:
            if indicator in full_text:
                complexity_score -= 1
        
        # Agent-specific keyword analysis
        if agent_type in self.agent_rules:
            agent_rules = self.agent_rules[agent_type]
            
            # Check for 70B keywords
            for keyword in agent_rules.get("keywords_70b", []):
                if keyword in full_text:
                    complexity_score += 1
                    reasoning_required = True
            
            # Check for 7B keywords
            for keyword in agent_rules.get("keywords_7b", []):
                if keyword in full_text:
                    complexity_score -= 1
        
        # Determine final model
        if complexity_score > 1 or reasoning_required:
            recommended_model = ModelSize.LARGE
            task_complexity = "high"
            confidence = min(0.9, 0.6 + (complexity_score * 0.1))
        elif complexity_score < -1:
            recommended_model = ModelSize.SMALL
            task_complexity = "low"
            confidence = min(0.9, 0.7 + (abs(complexity_score) * 0.05))
        else:
            # Use agent default for medium complexity
            recommended_model = default_model
            task_complexity = "medium"
            confidence = 0.6
        
        # Track real usage statistics
        self.usage_stats["total_requests"] += 1
        if recommended_model == ModelSize.SMALL:
            self.usage_stats["small_model_usage"] += 1
            # Estimate 70% token savings for 8B vs 70B
            self.usage_stats["token_savings_estimate"] += 0.7
        else:
            self.usage_stats["large_model_usage"] += 1
        
        return TaskClassification(
            agent_type=agent_type,
            task_complexity=task_complexity,
            requires_reasoning=reasoning_required,
            model_size=recommended_model,
            confidence=confidence
        )
    
    def get_model_config(self, classification: TaskClassification) -> Dict:
        """Get LLM configuration for the classified task"""
        return {
            "model": classification.model_size.value,
            "temperature": 0.7 if classification.requires_reasoning else 0.3,
            "api_key": self.groq_key
        }
    
    def route_request(self, agent_type: str, task: str, context: str = None) -> Tuple[Dict, TaskClassification]:
        """
        Main routing method - returns model config and classification
        """
        classification = self.classify_task(agent_type, task, context)
        config = self.get_model_config(classification)
        
        return config, classification
    
    def get_usage_stats(self) -> Dict:
        """Get real routing statistics"""
        total_requests = self.usage_stats["total_requests"]
        small_usage = self.usage_stats["small_model_usage"]
        large_usage = self.usage_stats["large_model_usage"]
        token_savings = self.usage_stats["token_savings_estimate"]
        
        small_percentage = (small_usage / total_requests * 100) if total_requests > 0 else 0
        large_percentage = (large_usage / total_requests * 100) if total_requests > 0 else 0
        avg_token_savings = (token_savings / total_requests) if total_requests > 0 else 0
        
        return {
            "total_requests": total_requests,
            "small_model_usage": small_usage,
            "large_model_usage": large_usage,
            "small_model_percentage": round(small_percentage, 1),
            "large_model_percentage": round(large_percentage, 1),
            "estimated_token_savings": round(avg_token_savings * 100, 1)
        }
    
    def reset_stats(self):
        """Reset usage statistics"""
        self.usage_stats = {
            "total_requests": 0,
            "small_model_usage": 0,
            "large_model_usage": 0,
            "token_savings_estimate": 0
        }

# Production usage and testing
if __name__ == "__main__":
    router = ModelRouter()
    
    # Production test cases
    test_cases = [
        ("pricer", "Calculate arbitrage opportunity between markets", None),
        ("market_analyzer", "Fetch market data and convert to JSON format", None),
        ("executive", "Coordinate task delegation to other agents", None),
        ("inventory", "Check current balance and update inventory", None),
        ("pricer", "Analyze complex pricing strategy for high-frequency trading", None),
        ("market_analyzer", "Perform complex analysis of market trends", None),
    ]
    
    print("=== Production Model Router Test Results ===\n")
    for agent, task, context in test_cases:
        config, classification = router.route_request(agent, task, context)
        model_name = "70B" if "70b" in config["model"] else "8B"
        
        print(f"Agent: {agent}")
        print(f"Task: {task}")
        print(f"Model: {model_name}")
        print(f"Complexity: {classification.task_complexity}")
        print(f"Confidence: {classification.confidence:.2f}")
        print("-" * 40)
    
    # Print real usage statistics
    stats = router.get_usage_stats()
    print(f"\nProduction Usage Statistics:")
    print(f"Total Requests: {stats['total_requests']}")
    print(f"8B Model Usage: {stats['small_model_usage']} ({stats['small_model_percentage']}%)")
    print(f"70B Model Usage: {stats['large_model_usage']} ({stats['large_model_percentage']}%)")
    print(f"Estimated Token Savings: {stats['estimated_token_savings']}%")