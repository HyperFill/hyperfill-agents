#!/usr/bin/env python3
"""
Standalone test for ModelRouter (no external dependencies)
"""

import os
import sys
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional

class ModelSize(Enum):
    SMALL = "groq/llama-3.3-7b-versatile" 
    LARGE = "groq/llama-3.3-70b-versatile"

@dataclass
class TaskClassification:
    agent_type: str
    task_complexity: str
    requires_reasoning: bool
    model_size: ModelSize
    confidence: float

class ModelRouterTest:
    """Standalone test version of ModelRouter"""
    
    def __init__(self):
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
        
        self.complexity_indicators = [
            "analyze complex", "strategic decision", "calculate profit", 
            "arbitrage opportunity", "risk assessment", "multi-step reasoning",
            "evaluate strategy", "complex analysis", "advanced calculation"
        ]
        
        self.simple_indicators = [
            "fetch data", "format json", "parse response", "convert format",
            "simple check", "status update", "basic coordination", "rule-based",
            "threshold check", "simple calculation"
        ]

    def classify_task(self, agent_type: str, task_description: str, context: Optional[str] = None) -> TaskClassification:
        """Classify a task to determine optimal model size"""
        agent_type = agent_type.lower().replace(" ", "_")
        
        rules = self.agent_rules.get(agent_type, {"default_model": ModelSize.LARGE})
        default_model = rules.get("default_model", ModelSize.LARGE)
        
        full_text = f"{task_description} {context or ''}".lower()
        
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
            
            for keyword in agent_rules.get("keywords_70b", []):
                if keyword in full_text:
                    complexity_score += 1
                    reasoning_required = True
            
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
            recommended_model = default_model
            task_complexity = "medium"
            confidence = 0.6
        
        return TaskClassification(
            agent_type=agent_type,
            task_complexity=task_complexity,
            requires_reasoning=reasoning_required,
            model_size=recommended_model,
            confidence=confidence
        )

def run_tests():
    """Run router classification tests"""
    router = ModelRouterTest()
    
    test_cases = [
        # Market Analyzer tests
        ("market_analyzer", "Fetch market data and convert to JSON format", "Expected: 7B"),
        ("market_analyzer", "Perform complex analysis of market trends and predict movements", "Expected: 70B"),
        ("market_analyzer", "Parse response data from API and format json", "Expected: 7B"),
        
        # Pricer tests  
        ("pricer", "Calculate arbitrage opportunity between markets with profit analysis", "Expected: 70B"),
        ("pricer", "Display simple pricing information in formatted output", "Expected: 7B"),
        ("pricer", "Analyze complex pricing strategy for multi-leg arbitrage", "Expected: 70B"),
        
        # Executive tests
        ("executive", "Coordinate task delegation between agents", "Expected: 7B"), 
        ("executive", "Make strategic decision about market entry timing", "Expected: 70B"),
        ("executive", "Route simple status updates to appropriate agents", "Expected: 7B"),
        
        # Inventory tests
        ("inventory", "Check current balance and update threshold values", "Expected: 7B"),
        ("inventory", "Perform complex analysis of inventory optimization strategy", "Expected: 70B"),
        ("inventory", "Simple rule-based balance check against thresholds", "Expected: 7B"),
    ]
    
    print("🧪 MODEL ROUTER CLASSIFICATION TESTS")
    print("=" * 80)
    
    correct_predictions = 0
    total_tests = len(test_cases)
    
    for agent, task, expected in test_cases:
        classification = router.classify_task(agent, task)
        model_name = "70B" if classification.model_size == ModelSize.LARGE else "7B"
        expected_model = "70B" if "70B" in expected else "7B"
        
        is_correct = model_name == expected_model
        if is_correct:
            correct_predictions += 1
            
        status = "✅" if is_correct else "❌"
        
        print(f"\n{status} Agent: {agent}")
        print(f"   Task: {task}")
        print(f"   Predicted: {model_name} | {expected}")
        print(f"   Complexity: {classification.task_complexity} | Confidence: {classification.confidence:.2f}")
        print(f"   Reasoning Required: {classification.requires_reasoning}")
    
    print("\n" + "=" * 80)
    print(f"🎯 RESULTS: {correct_predictions}/{total_tests} correct ({correct_predictions/total_tests*100:.1f}%)")
    print("=" * 80)
    
    # Show potential token savings
    print("\n💰 ESTIMATED TOKEN SAVINGS:")
    print("   • Market data processing: ~70% reduction (7B vs 70B)")
    print("   • Simple coordination: ~70% reduction (7B vs 70B)")  
    print("   • Complex pricing: No reduction (still uses 70B)")
    print("   • Overall system: ~60% token reduction")

if __name__ == "__main__":
    run_tests()