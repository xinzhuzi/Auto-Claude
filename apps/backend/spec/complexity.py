"""
Complexity Assessment Module
=============================

AI and heuristic-based task complexity analysis.
Determines which phases should run based on task scope.

Multi-dimensional complexity evaluation:
- Code Coupling (25%): Dependencies, cross-module impact, interface changes
- Cognitive Complexity (20%): Business logic, algorithms, state management
- Change Impact (20%): Breaking changes, regression risk, compatibility
- Domain Knowledge (15%): Tech stack, business domain, external APIs
- Test Complexity (10%): Coverage difficulty, mock requirements, E2E needs
- Resource Estimation (10%): File changes, code volume, collaboration needs
"""

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path


# Spec size thresholds for chunking decisions
SPEC_SIZE_THRESHOLDS = {
    "tiny": 5000,  # < 5K chars: no chunking needed
    "small": 15000,  # 5K-15K: might need chunking
    "medium": 50000,  # 15K-50K: needs chunking (2-3 chunks)
    "large": 150000,  # 50K-150K: needs chunking (4-6 chunks)
    "huge": 500000,  # > 150K: needs chunking (7+ chunks)
}


def needs_chunking(estimated_size: int) -> tuple[bool, str, int]:
    """
    Determine if chunked creation is needed (standalone function).

    This is a module-level function for use by standalone functions like
    run_ai_complexity_assessment() that don't have access to class methods.

    Args:
        estimated_size: Estimated character count

    Returns:
        (needs_chunking, size_level, suggested_chunks)
    """
    if estimated_size <= SPEC_SIZE_THRESHOLDS["small"]:
        return False, "small", 1
    elif estimated_size <= SPEC_SIZE_THRESHOLDS["medium"]:
        return True, "medium", max(2, estimated_size // 20000)
    elif estimated_size <= SPEC_SIZE_THRESHOLDS["large"]:
        return True, "large", max(3, estimated_size // 15000)
    else:
        return True, "huge", max(5, estimated_size // 30000)


class Complexity(Enum):
    """Task complexity tiers that determine which phases to run."""

    SIMPLE = "simple"  # Composite score 0-3.0
    STANDARD = "standard"  # Composite score 3.1-6.0
    COMPLEX = "complex"  # Composite score 6.1-10.0


@dataclass
class MultiDimensionalAnalysis:
    """Multi-dimensional complexity analysis result."""

    code_coupling: float = 2.0  # 0-10: Dependencies, cross-module impact
    cognitive: float = 2.0  # 0-10: Business logic, algorithms
    change_impact: float = 2.0  # 0-10: Breaking changes, regression risk
    domain_knowledge: float = 2.0  # 0-10: Tech stack, business domain
    test_complexity: float = 2.0  # 0-10: Coverage difficulty, mock needs
    resource_estimation: float = 2.0  # 0-10: File changes, code volume

    # Reasoning for each dimension
    code_coupling_reason: str = ""
    cognitive_reason: str = ""
    change_impact_reason: str = ""
    domain_knowledge_reason: str = ""
    test_complexity_reason: str = ""
    resource_estimation_reason: str = ""

    # Dimension weights
    WEIGHTS = {
        "code_coupling": 0.25,
        "cognitive": 0.20,
        "change_impact": 0.20,
        "domain_knowledge": 0.15,
        "test_complexity": 0.10,
        "resource_estimation": 0.10,
    }

    def composite_score(self) -> float:
        """Calculate weighted composite score (0-10)."""
        return (
            self.code_coupling * self.WEIGHTS["code_coupling"]
            + self.cognitive * self.WEIGHTS["cognitive"]
            + self.change_impact * self.WEIGHTS["change_impact"]
            + self.domain_knowledge * self.WEIGHTS["domain_knowledge"]
            + self.test_complexity * self.WEIGHTS["test_complexity"]
            + self.resource_estimation * self.WEIGHTS["resource_estimation"]
        )

    def get_complexity_tier(self) -> Complexity:
        """Map composite score to complexity tier."""
        score = self.composite_score()

        # Special rules: any dimension >= 8 triggers COMPLEX
        if any(
            dim >= 8
            for dim in [
                self.code_coupling,
                self.cognitive,
                self.change_impact,
                self.domain_knowledge,
                self.test_complexity,
                self.resource_estimation,
            ]
        ):
            return Complexity.COMPLEX

        # Special rule: code_coupling + change_impact >= 12 triggers COMPLEX
        if self.code_coupling + self.change_impact >= 12:
            return Complexity.COMPLEX

        # Special rule: cognitive >= 7 triggers COMPLEX (complex algorithms/concurrency)
        if self.cognitive >= 7:
            return Complexity.COMPLEX

        # Special rule: domain_knowledge >= 7 triggers COMPLEX (expert domain)
        if self.domain_knowledge >= 7:
            return Complexity.COMPLEX

        # Special rule: multiple high dimensions (>= 6) triggers COMPLEX
        high_dims = sum(
            1
            for dim in [
                self.code_coupling,
                self.cognitive,
                self.change_impact,
                self.domain_knowledge,
                self.test_complexity,
                self.resource_estimation,
            ]
            if dim >= 6
        )
        if high_dims >= 3:
            return Complexity.COMPLEX

        if score <= 3.0:
            return Complexity.SIMPLE
        elif score <= 6.0:
            return Complexity.STANDARD
        else:
            return Complexity.COMPLEX

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "code_coupling": {
                "score": self.code_coupling,
                "reasoning": self.code_coupling_reason,
            },
            "cognitive": {"score": self.cognitive, "reasoning": self.cognitive_reason},
            "change_impact": {
                "score": self.change_impact,
                "reasoning": self.change_impact_reason,
            },
            "domain_knowledge": {
                "score": self.domain_knowledge,
                "reasoning": self.domain_knowledge_reason,
            },
            "test_complexity": {
                "score": self.test_complexity,
                "reasoning": self.test_complexity_reason,
            },
            "resource_estimation": {
                "score": self.resource_estimation,
                "reasoning": self.resource_estimation_reason,
            },
            "composite_score": self.composite_score(),
            "complexity_tier": self.get_complexity_tier().value,
        }


@dataclass
class ComplexityAssessment:
    """Result of analyzing task complexity."""

    complexity: Complexity
    confidence: float  # 0.0 to 1.0
    signals: dict = field(default_factory=dict)
    reasoning: str = ""

    # Detected characteristics
    estimated_files: int = 1
    estimated_services: int = 1
    external_integrations: list = field(default_factory=list)
    infrastructure_changes: bool = False

    # AI-recommended phases (if using AI assessment)
    recommended_phases: list = field(default_factory=list)

    # Flags from AI assessment
    needs_research: bool = False
    needs_self_critique: bool = False

    # Chunking-related fields for spec generation
    estimated_spec_size: int = 0
    requires_chunking: bool = False
    chunking_strategy: str = "single"  # single, small, medium, large
    suggested_chunks: int = 1

    # Multi-dimensional analysis (new)
    multi_dimensional: MultiDimensionalAnalysis = field(
        default_factory=MultiDimensionalAnalysis
    )

    def phases_to_run(self) -> list[str]:
        """Return list of phase names to run based on complexity."""
        # If AI provided recommended phases, use those
        if self.recommended_phases:
            return self.recommended_phases

        # Otherwise fall back to default phase sets
        # Note: historical_context runs early (after discovery) if Graphiti is enabled
        # It's included by default but gracefully skips if not configured
        if self.complexity == Complexity.SIMPLE:
            return ["discovery", "historical_context", "quick_spec", "validation"]
        elif self.complexity == Complexity.STANDARD:
            # Standard can optionally include research if flagged
            phases = ["discovery", "historical_context", "requirements"]
            if self.needs_research:
                phases.append("research")
            phases.extend(["context", "spec_writing", "planning", "validation"])
            return phases
        else:  # COMPLEX
            return [
                "discovery",
                "historical_context",
                "requirements",
                "research",
                "context",
                "spec_writing",
                "self_critique",
                "planning",
                "validation",
            ]


class ComplexityAnalyzer:
    """Analyzes task description and context to determine complexity."""

    # Keywords that suggest different complexity levels
    SIMPLE_KEYWORDS = [
        "fix",
        "typo",
        "update",
        "change",
        "rename",
        "remove",
        "delete",
        "adjust",
        "tweak",
        "correct",
        "modify",
        "style",
        "color",
        "text",
        "label",
        "button",
        "margin",
        "padding",
        "font",
        "size",
        "hide",
        "show",
    ]

    COMPLEX_KEYWORDS = [
        "integrate",
        "integration",
        "api",
        "sdk",
        "library",
        "package",
        "database",
        "migrate",
        "migration",
        "docker",
        "kubernetes",
        "deploy",
        "authentication",
        "oauth",
        "graphql",
        "websocket",
        "queue",
        "cache",
        "redis",
        "postgres",
        "mongo",
        "elasticsearch",
        "kafka",
        "rabbitmq",
        "microservice",
        "refactor",
        "architecture",
        "infrastructure",
    ]

    MULTI_SERVICE_KEYWORDS = [
        "backend",
        "frontend",
        "worker",
        "service",
        "api",
        "client",
        "server",
        "database",
        "queue",
        "cache",
        "proxy",
    ]

    # Multi-dimensional analysis keywords
    CORE_MODULE_KEYWORDS = [
        "base",
        "core",
        "common",
        "shared",
        "utils",
        "helpers",
        "middleware",
        "interceptor",
        "decorator",
        "mixin",
        "abstract",
        "interface",
        "protocol",
        "contract",
    ]

    CROSS_SERVICE_KEYWORDS = [
        "api",
        "rpc",
        "grpc",
        "graphql",
        "websocket",
        "event",
        "message",
        "queue",
        "pubsub",
        "broadcast",
    ]

    ALGORITHM_COMPLEXITY = {
        "exponential": [
            "np-hard",
            "combinatorial",
            "permutation",
            "backtracking",
            "branch and bound",
            "genetic",
            "simulated annealing",
        ],
        "polynomial": [
            "graph",
            "shortest path",
            "spanning tree",
            "dynamic programming",
            "matrix",
            "optimization",
        ],
        "logarithmic": [
            "binary search",
            "tree traversal",
            "divide and conquer",
            "heap",
            "balanced tree",
            "index",
        ],
        "linear": ["iterate", "loop", "map", "filter", "reduce", "sequential", "scan"],
    }

    CONCURRENCY_KEYWORDS = {
        "distributed": [
            "distributed",
            "consensus",
            "raft",
            "paxos",
            "2pc",
            "saga",
            "eventual consistency",
            "cqrs",
            "event sourcing",
        ],
        "parallel": [
            "parallel",
            "multithread",
            "worker pool",
            "fork join",
            "map reduce",
            "scatter gather",
        ],
        "async": [
            "async",
            "await",
            "promise",
            "future",
            "callback",
            "event loop",
            "non-blocking",
        ],
    }

    BREAKING_CHANGE_KEYWORDS = [
        "remove",
        "delete",
        "deprecate",
        "rename",
        "replace",
        "migrate",
        "breaking",
        "incompatible",
        "major",
    ]

    REGRESSION_RISK_AREAS = [
        "authentication",
        "authorization",
        "payment",
        "billing",
        "data integrity",
        "security",
        "performance",
        "caching",
        "session",
        "state",
        "transaction",
        "concurrency",
    ]

    DOMAIN_COMPLEXITY = {
        "expert": [
            "finance",
            "healthcare",
            "legal",
            "insurance",
            "trading",
            "compliance",
            "security",
            "cryptography",
            "machine learning",
            "ml pipeline",
            "deep learning",
            "neural network",
            "tensorflow",
            "pytorch",
            "computer vision",
            "nlp",
            "natural language",
            "fraud detection",
            "recommendation",
            "ai model",
        ],
        "specialized": [
            "e-commerce",
            "logistics",
            "inventory",
            "crm",
            "erp",
            "analytics",
            "reporting",
            "workflow",
            "notification",
            "messaging",
            "search",
        ],
        "generic": [
            "crud",
            "admin",
            "dashboard",
            "settings",
            "profile",
            "preferences",
            "ui",
            "styling",
        ],
    }

    def __init__(self, project_index: dict | None = None):
        self.project_index = project_index or {}

    def analyze(
        self, task_description: str, requirements: dict | None = None
    ) -> ComplexityAssessment:
        """Analyze task and return complexity assessment."""
        task_lower = task_description.lower()
        signals = {}

        # 1. Keyword analysis
        simple_matches = sum(1 for kw in self.SIMPLE_KEYWORDS if kw in task_lower)
        complex_matches = sum(1 for kw in self.COMPLEX_KEYWORDS if kw in task_lower)
        multi_service_matches = sum(
            1 for kw in self.MULTI_SERVICE_KEYWORDS if kw in task_lower
        )

        signals["simple_keywords"] = simple_matches
        signals["complex_keywords"] = complex_matches
        signals["multi_service_keywords"] = multi_service_matches

        # 2. External integrations detection
        integrations = self._detect_integrations(task_lower)
        signals["external_integrations"] = len(integrations)

        # 3. Infrastructure changes detection
        infra_changes = self._detect_infrastructure_changes(task_lower)
        signals["infrastructure_changes"] = infra_changes

        # 4. Estimate files and services
        estimated_files = self._estimate_files(task_lower, requirements)
        estimated_services = self._estimate_services(task_lower, requirements)
        signals["estimated_files"] = estimated_files
        signals["estimated_services"] = estimated_services

        # 5. Requirements-based signals (if available)
        if requirements:
            services_involved = requirements.get("services_involved", [])
            signals["explicit_services"] = len(services_involved)
            estimated_services = max(estimated_services, len(services_involved))

        # 6. Multi-dimensional analysis (new)
        multi_dim = self._analyze_multi_dimensional(
            task_lower, requirements, integrations, infra_changes,
            estimated_files, estimated_services, signals
        )

        # Determine complexity using multi-dimensional analysis
        complexity = multi_dim.get_complexity_tier()
        confidence = self._calculate_confidence(multi_dim)
        reasoning = self._build_reasoning(multi_dim)

        # 7. Estimate spec size and chunking needs
        estimated_spec_size = self.estimate_spec_size(task_description, requirements)
        requires_chunking, chunking_strategy, suggested_chunks = self.needs_chunking(
            estimated_spec_size
        )

        return ComplexityAssessment(
            complexity=complexity,
            confidence=confidence,
            signals=signals,
            reasoning=reasoning,
            estimated_files=estimated_files,
            estimated_services=estimated_services,
            external_integrations=integrations,
            infrastructure_changes=infra_changes,
            multi_dimensional=multi_dim,
            estimated_spec_size=estimated_spec_size,
            requires_chunking=requires_chunking,
            chunking_strategy=chunking_strategy,
            suggested_chunks=suggested_chunks,
        )

    def _analyze_multi_dimensional(
        self,
        task_lower: str,
        requirements: dict | None,
        integrations: list,
        infra_changes: bool,
        estimated_files: int,
        estimated_services: int,
        signals: dict,
    ) -> MultiDimensionalAnalysis:
        """Perform multi-dimensional complexity analysis."""
        analysis = MultiDimensionalAnalysis()

        # Dimension 1: Code Coupling (25%)
        analysis.code_coupling, analysis.code_coupling_reason = (
            self._analyze_code_coupling(task_lower, estimated_services, integrations)
        )

        # Dimension 2: Cognitive Complexity (20%)
        analysis.cognitive, analysis.cognitive_reason = (
            self._analyze_cognitive_complexity(task_lower)
        )

        # Dimension 3: Change Impact (20%)
        analysis.change_impact, analysis.change_impact_reason = (
            self._analyze_change_impact(task_lower, infra_changes)
        )

        # Dimension 4: Domain Knowledge (15%)
        analysis.domain_knowledge, analysis.domain_knowledge_reason = (
            self._analyze_domain_knowledge(task_lower, integrations)
        )

        # Dimension 5: Test Complexity (10%)
        analysis.test_complexity, analysis.test_complexity_reason = (
            self._analyze_test_complexity(task_lower, integrations, infra_changes)
        )

        # Dimension 6: Resource Estimation (10%)
        analysis.resource_estimation, analysis.resource_estimation_reason = (
            self._analyze_resource_estimation(estimated_files, estimated_services, signals)
        )

        return analysis

    def _analyze_code_coupling(
        self, task_lower: str, estimated_services: int, integrations: list
    ) -> tuple[float, str]:
        """Analyze code coupling dimension (0-10)."""
        score = 2.0  # Base score
        reasons = []

        # Core module modifications (high impact)
        core_matches = sum(1 for kw in self.CORE_MODULE_KEYWORDS if kw in task_lower)
        if core_matches > 0:
            score += min(core_matches * 2.0, 5)
            reasons.append(f"{core_matches} core module keywords")

        # Cross-service communication
        cross_service_matches = sum(
            1 for kw in self.CROSS_SERVICE_KEYWORDS if kw in task_lower
        )
        if cross_service_matches > 0:
            score += min(cross_service_matches * 1.5, 4)
            reasons.append(f"{cross_service_matches} cross-service keywords")

        # Multiple services (significant coupling)
        if estimated_services >= 3:
            score += 3
            reasons.append(f"{estimated_services} services involved")
        elif estimated_services == 2:
            score += 1.5
            reasons.append("2 services involved")

        # External integrations add coupling
        if len(integrations) > 0:
            score += min(len(integrations) * 1.0, 3)
            reasons.append(f"{len(integrations)} external integrations")

        score = min(score, 10)
        reason = "; ".join(reasons) if reasons else "Low coupling, isolated change"
        return score, reason

    def _analyze_cognitive_complexity(self, task_lower: str) -> tuple[float, str]:
        """Analyze cognitive complexity dimension (0-10)."""
        score = 2.0  # Base score
        reasons = []

        # Algorithm complexity (significant impact)
        for level, keywords in self.ALGORITHM_COMPLEXITY.items():
            matches = sum(1 for kw in keywords if kw in task_lower)
            if matches > 0:
                level_scores = {
                    "exponential": 5,
                    "polynomial": 4,
                    "logarithmic": 2.5,
                    "linear": 0.5,
                }
                score += level_scores.get(level, 1)
                reasons.append(f"{level} algorithm ({matches} keywords)")
                break

        # Concurrency complexity (significant impact)
        for level, keywords in self.CONCURRENCY_KEYWORDS.items():
            matches = sum(1 for kw in keywords if kw in task_lower)
            if matches > 0:
                level_scores = {"distributed": 5, "parallel": 3.5, "async": 2}
                score += level_scores.get(level, 1)
                reasons.append(f"{level} concurrency ({matches} keywords)")
                break

        # State management indicators
        state_keywords = ["state", "session", "cache", "store", "persist", "transaction"]
        state_matches = sum(1 for kw in state_keywords if kw in task_lower)
        if state_matches > 0:
            score += min(state_matches * 0.8, 2.5)
            reasons.append(f"{state_matches} state management keywords")

        # Business logic indicators
        business_keywords = ["workflow", "rule", "policy", "validation", "approval"]
        business_matches = sum(1 for kw in business_keywords if kw in task_lower)
        if business_matches > 0:
            score += min(business_matches * 0.8, 2.5)
            reasons.append(f"{business_matches} business logic keywords")

        score = min(score, 10)
        reason = "; ".join(reasons) if reasons else "Simple linear logic"
        return score, reason

    def _analyze_change_impact(
        self, task_lower: str, infra_changes: bool
    ) -> tuple[float, str]:
        """Analyze change impact dimension (0-10)."""
        score = 2.0  # Base score
        reasons = []

        # Breaking change indicators (high impact)
        breaking_matches = sum(
            1 for kw in self.BREAKING_CHANGE_KEYWORDS if kw in task_lower
        )
        if breaking_matches > 0:
            score += min(breaking_matches * 1.5, 4)
            reasons.append(f"{breaking_matches} breaking change keywords")

        # Regression risk areas (high impact)
        risk_matches = sum(1 for area in self.REGRESSION_RISK_AREAS if area in task_lower)
        if risk_matches > 0:
            score += min(risk_matches * 2.0, 5)
            reasons.append(f"{risk_matches} high-risk areas")

        # Infrastructure changes (significant impact)
        if infra_changes:
            score += 3
            reasons.append("infrastructure changes")

        # API/Schema changes
        api_schema_keywords = ["api", "schema", "endpoint", "contract", "interface"]
        api_matches = sum(1 for kw in api_schema_keywords if kw in task_lower)
        if api_matches > 0:
            score += min(api_matches * 0.8, 2.5)
            reasons.append(f"{api_matches} API/schema keywords")

        score = min(score, 10)
        reason = "; ".join(reasons) if reasons else "Low impact, backward compatible"
        return score, reason

    def _analyze_domain_knowledge(
        self, task_lower: str, integrations: list
    ) -> tuple[float, str]:
        """Analyze domain knowledge requirement dimension (0-10)."""
        score = 2.0  # Base score
        reasons = []

        # Domain complexity (significant impact)
        for level, domains in self.DOMAIN_COMPLEXITY.items():
            matches = sum(1 for d in domains if d in task_lower)
            if matches > 0:
                level_scores = {"expert": 5, "specialized": 3, "generic": 0}
                score += level_scores.get(level, 1)
                reasons.append(f"{level} domain ({matches} keywords)")
                break

        # External integrations require learning
        if len(integrations) > 0:
            score += min(len(integrations) * 1.5, 4)
            reasons.append(f"{len(integrations)} external APIs to learn")

        # New technology indicators
        new_tech_keywords = ["new", "unfamiliar", "first time", "learn", "research"]
        new_tech_matches = sum(1 for kw in new_tech_keywords if kw in task_lower)
        if new_tech_matches > 0:
            score += min(new_tech_matches * 0.8, 2)
            reasons.append(f"{new_tech_matches} new technology indicators")

        score = min(score, 10)
        reason = "; ".join(reasons) if reasons else "Standard domain knowledge"
        return score, reason

    def _analyze_test_complexity(
        self, task_lower: str, integrations: list, infra_changes: bool
    ) -> tuple[float, str]:
        """Analyze test complexity dimension (0-10)."""
        score = 2.0  # Base score
        reasons = []

        # External dependencies need mocking
        if len(integrations) > 0:
            score += min(len(integrations) * 1.5, 4)
            reasons.append(f"{len(integrations)} dependencies to mock")

        # Infrastructure testing
        if infra_changes:
            score += 2.5
            reasons.append("infrastructure testing needed")

        # E2E testing indicators
        e2e_keywords = ["user flow", "end to end", "e2e", "integration", "full stack"]
        e2e_matches = sum(1 for kw in e2e_keywords if kw in task_lower)
        if e2e_matches > 0:
            score += min(e2e_matches * 1.5, 3)
            reasons.append(f"{e2e_matches} E2E testing keywords")

        # Security testing
        security_keywords = ["security", "auth", "permission", "encryption", "credential"]
        security_matches = sum(1 for kw in security_keywords if kw in task_lower)
        if security_matches > 0:
            score += min(security_matches * 1.0, 3)
            reasons.append(f"{security_matches} security testing keywords")

        score = min(score, 10)
        reason = "; ".join(reasons) if reasons else "Simple unit testing"
        return score, reason

    def _analyze_resource_estimation(
        self, estimated_files: int, estimated_services: int, signals: dict
    ) -> tuple[float, str]:
        """Analyze resource estimation dimension (0-10)."""
        reasons = []

        # File-based score (adjusted thresholds)
        if estimated_files <= 2:
            file_score = 2
        elif estimated_files <= 5:
            file_score = 3.5
        elif estimated_files <= 10:
            file_score = 5.5
        elif estimated_files <= 20:
            file_score = 7.5
        else:
            file_score = 9
        reasons.append(f"{estimated_files} files")

        # Service-based adjustment
        service_adjustment = min((estimated_services - 1) * 1.5, 4)
        if estimated_services > 1:
            reasons.append(f"{estimated_services} services")

        # Complexity keyword adjustment
        complex_keywords = signals.get("complex_keywords", 0)
        keyword_adjustment = min(complex_keywords * 0.5, 3)
        if complex_keywords > 0:
            reasons.append(f"{complex_keywords} complex keywords")

        score = min(file_score + service_adjustment + keyword_adjustment, 10)
        reason = "; ".join(reasons)
        return score, reason

    def _calculate_confidence(self, multi_dim: MultiDimensionalAnalysis) -> float:
        """Calculate confidence based on multi-dimensional analysis."""
        score = multi_dim.composite_score()

        # Higher confidence for extreme scores (clearly simple or complex)
        if score <= 2.0 or score >= 8.0:
            return 0.9
        elif score <= 3.0 or score >= 7.0:
            return 0.85
        else:
            return 0.75

    def _build_reasoning(self, multi_dim: MultiDimensionalAnalysis) -> str:
        """Build reasoning string from multi-dimensional analysis."""
        parts = []
        score = multi_dim.composite_score()
        tier = multi_dim.get_complexity_tier().value.upper()

        parts.append(f"Composite score: {score:.2f} → {tier}")

        # Add top contributing dimensions
        dimensions = [
            ("Code Coupling", multi_dim.code_coupling, multi_dim.code_coupling_reason),
            ("Cognitive", multi_dim.cognitive, multi_dim.cognitive_reason),
            ("Change Impact", multi_dim.change_impact, multi_dim.change_impact_reason),
            ("Domain Knowledge", multi_dim.domain_knowledge, multi_dim.domain_knowledge_reason),
            ("Test Complexity", multi_dim.test_complexity, multi_dim.test_complexity_reason),
            ("Resource", multi_dim.resource_estimation, multi_dim.resource_estimation_reason),
        ]

        # Sort by score descending and take top 3
        top_dims = sorted(dimensions, key=lambda x: x[1], reverse=True)[:3]
        for name, score, reason in top_dims:
            if reason:
                parts.append(f"{name}({score:.1f}): {reason}")

        return "; ".join(parts)

    def _detect_integrations(self, task_lower: str) -> list[str]:
        """Detect external integrations mentioned in task."""
        integration_patterns = [
            r"\b(graphiti|graphql|apollo)\b",
            r"\b(stripe|paypal|payment)\b",
            r"\b(auth0|okta|oauth|jwt)\b",
            r"\b(aws|gcp|azure|s3|lambda)\b",
            r"\b(redis|memcached|cache)\b",
            r"\b(postgres|mysql|mongodb|database)\b",
            r"\b(elasticsearch|algolia|search)\b",
            r"\b(kafka|rabbitmq|sqs|queue)\b",
            r"\b(docker|kubernetes|k8s)\b",
            r"\b(openai|anthropic|llm|ai)\b",
            r"\b(sendgrid|twilio|email|sms)\b",
        ]

        found = []
        for pattern in integration_patterns:
            matches = re.findall(pattern, task_lower)
            found.extend(matches)

        return list(set(found))

    def _detect_infrastructure_changes(self, task_lower: str) -> bool:
        """Detect if task involves infrastructure changes."""
        infra_patterns = [
            r"\bdocker\b",
            r"\bkubernetes\b",
            r"\bk8s\b",
            r"\bdeploy\b",
            r"\binfrastructure\b",
            r"\bci/cd\b",
            r"\benvironment\b",
            r"\bconfig\b",
            r"\b\.env\b",
            r"\bdatabase migration\b",
            r"\bschema\b",
        ]

        for pattern in infra_patterns:
            if re.search(pattern, task_lower):
                return True
        return False

    def _estimate_files(self, task_lower: str, requirements: dict | None) -> int:
        """Estimate number of files to be modified."""
        # 尝试目录扫描（更准确）
        from .directory_scanner import estimate_from_paths

        project_dir = getattr(self, "project_dir", None)
        task_desc = getattr(self, "task_description", task_lower)
        scan_result = estimate_from_paths(task_desc, project_dir)
        if scan_result:
            file_count, _ = scan_result
            return file_count

        # 回退到原有逻辑：基于关键词估算
        if any(
            kw in task_lower
            for kw in ["single", "one file", "one component", "this file"]
        ):
            return 1

        # Check for explicit file mentions
        file_mentions = len(
            re.findall(r"\.(tsx?|jsx?|py|go|rs|java|rb|php|vue|svelte)\b", task_lower)
        )
        if file_mentions > 0:
            return max(1, file_mentions)

        # Heuristic based on task scope
        if any(kw in task_lower for kw in self.SIMPLE_KEYWORDS):
            return 2
        elif any(kw in task_lower for kw in ["feature", "add", "implement", "create"]):
            return 5
        elif any(kw in task_lower for kw in self.COMPLEX_KEYWORDS):
            return 15

        return 5  # Default estimate

    def _estimate_services(self, task_lower: str, requirements: dict | None) -> int:
        """Estimate number of services involved."""
        service_count = sum(1 for kw in self.MULTI_SERVICE_KEYWORDS if kw in task_lower)

        # If project is a monorepo, check project_index
        if self.project_index.get("project_type") == "monorepo":
            services = self.project_index.get("services", {})
            if services:
                # Check which services are mentioned
                mentioned = sum(1 for svc in services if svc.lower() in task_lower)
                if mentioned > 0:
                    return mentioned

        return max(1, min(service_count, 5))

    def _is_documentation_task(self, task_lower: str) -> bool:
        """Check if task is documentation-related."""
        doc_keywords = [
            "文档", "手册", "指南", "教程", "readme",
            "小说", "剧情", "章节", "大纲", "细纲",
            "documentation", "manual", "guide", "tutorial",
            "novel", "story", "chapter", "outline",
        ]
        return any(kw in task_lower for kw in doc_keywords)

    def _extract_chapter_count(self, task_lower: str) -> int:
        """Extract chapter count from task description."""
        # Match patterns like "20章", "20 chapters", "第20卷"
        patterns = [
            r"(\d+)\s*章",
            r"(\d+)\s*chapters?",
            r"第\s*(\d+)\s*[卷章]",
            r"(\d+)\s*sections?",
        ]
        for pattern in patterns:
            match = re.search(pattern, task_lower)
            if match:
                return int(match.group(1))
        return 1

    def _infer_documentation_stage(self, task_lower: str) -> str:
        """Infer documentation stage from task description."""
        if any(kw in task_lower for kw in ["大纲", "outline", "概要", "summary"]):
            return "outline"
        elif any(kw in task_lower for kw in ["细纲", "chapter", "章节", "detailed"]):
            return "chapter"
        elif any(kw in task_lower for kw in ["正文", "content", "全文", "full"]):
            return "content"
        return "general"

    def estimate_spec_size(
        self, task_description: str, requirements: dict | None = None
    ) -> int:
        """Estimate the expected size of spec.md in characters."""
        # 尝试目录扫描获取实际内容大小
        from .directory_scanner import estimate_from_paths

        project_dir = getattr(self, "project_dir", None)
        scan_result = estimate_from_paths(task_description, project_dir)
        if scan_result:
            _, total_chars = scan_result
            # 实际内容大小 + 基础模板大小
            return total_chars + 3000

        # 回退到原有启发式估算
        task_lower = task_description.lower()
        base_size = 3000  # Base template size

        # Based on task description length
        base_size += len(task_description) * 2

        # Based on requirements count
        if requirements:
            user_reqs = requirements.get("user_requirements", [])
            acceptance = requirements.get("acceptance_criteria", [])
            base_size += len(user_reqs) * 500
            base_size += len(acceptance) * 300

            # Services add complexity
            services = requirements.get("services_involved", [])
            base_size += len(services) * 800

        # Documentation tasks need special handling
        if self._is_documentation_task(task_lower):
            chapter_count = self._extract_chapter_count(task_lower)
            stage = self._infer_documentation_stage(task_lower)
            stage_multipliers = {
                "outline": 2000,
                "chapter": 5000,
                "content": 10000,
                "general": 3000,
            }
            base_size += chapter_count * stage_multipliers.get(stage, 3000)

        return base_size

    def needs_chunking(self, estimated_size: int) -> tuple[bool, str, int]:
        """Determine if chunking is needed.

        Returns:
            tuple: (needs_chunking, strategy, suggested_chunks)
        """
        if estimated_size <= SPEC_SIZE_THRESHOLDS["small"]:
            return False, "single", 1
        elif estimated_size <= SPEC_SIZE_THRESHOLDS["medium"]:
            return True, "small", 2
        elif estimated_size <= SPEC_SIZE_THRESHOLDS["large"]:
            return True, "medium", 3
        else:
            chunks = min(7, estimated_size // 50000 + 1)
            return True, "large", chunks

    def _calculate_complexity(
        self,
        signals: dict,
        integrations: list,
        infra_changes: bool,
        estimated_files: int,
        estimated_services: int,
    ) -> tuple[Complexity, float, str]:
        """Calculate final complexity based on all signals."""

        reasons = []

        # Strong indicators for SIMPLE
        if (
            estimated_files <= 2
            and estimated_services == 1
            and len(integrations) == 0
            and not infra_changes
            and signals["simple_keywords"] > 0
            and signals["complex_keywords"] == 0
        ):
            reasons.append(
                f"Single service, {estimated_files} file(s), no integrations"
            )
            return Complexity.SIMPLE, 0.9, "; ".join(reasons)

        # Strong indicators for COMPLEX
        if (
            len(integrations) >= 2
            or infra_changes
            or estimated_services >= 3
            or estimated_files >= 10
            or signals["complex_keywords"] >= 3
        ):
            reasons.append(
                f"{len(integrations)} integrations, {estimated_services} services, {estimated_files} files"
            )
            if infra_changes:
                reasons.append("infrastructure changes detected")
            return Complexity.COMPLEX, 0.85, "; ".join(reasons)

        # Default to STANDARD
        reasons.append(f"{estimated_files} files, {estimated_services} service(s)")
        if len(integrations) > 0:
            reasons.append(f"{len(integrations)} integration(s)")

        return Complexity.STANDARD, 0.75, "; ".join(reasons)


async def run_ai_complexity_assessment(
    spec_dir: Path,
    task_description: str,
    run_agent_fn,
) -> ComplexityAssessment | None:
    """Run AI agent to assess complexity. Returns None if it fails.

    Args:
        spec_dir: Path to spec directory
        task_description: Task description string
        run_agent_fn: Async function to run the agent with prompt
    """
    assessment_file = spec_dir / "complexity_assessment.json"

    # Prepare context for the AI
    context = f"""
**Project Directory**: {spec_dir.parent.parent}
**Spec Directory**: {spec_dir}
"""

    # Load requirements if available
    requirements_file = spec_dir / "requirements.json"
    if requirements_file.exists():
        with open(requirements_file, encoding="utf-8") as f:
            req = json.load(f)
            context += f"""
## Requirements (from user)
**Task Description**: {req.get("task_description", "Not provided")}
**Workflow Type**: {req.get("workflow_type", "Not specified")}
**Services Involved**: {", ".join(req.get("services_involved", []))}
**User Requirements**:
{chr(10).join(f"- {r}" for r in req.get("user_requirements", []))}
**Acceptance Criteria**:
{chr(10).join(f"- {c}" for c in req.get("acceptance_criteria", []))}
**Constraints**:
{chr(10).join(f"- {c}" for c in req.get("constraints", []))}
"""
    else:
        context += f"\n**Task Description**: {task_description or 'Not provided'}\n"

    # Add project index if available
    auto_build_index = spec_dir.parent.parent / "auto-claude" / "project_index.json"
    if auto_build_index.exists():
        context += f"\n**Project Index**: Available at {auto_build_index}\n"

    # Point to requirements file for detailed reading
    if requirements_file.exists():
        context += f"\n**Requirements File**: {requirements_file} (read this for full details)\n"

    try:
        success, output = await run_agent_fn(
            "complexity_assessor.md",
            additional_context=context,
        )

        if success and assessment_file.exists():
            with open(assessment_file, encoding="utf-8") as f:
                data = json.load(f)

            # Parse AI assessment into ComplexityAssessment
            complexity_str = data.get("complexity", "standard").lower()
            complexity = Complexity(complexity_str)

            # Extract flags
            flags = data.get("flags", {})

            # Extract scope information for chunking calculation
            scope_analysis = data.get("analysis", {}).get("scope", {})
            ai_estimated_files = scope_analysis.get("estimated_files", 5)
            ai_estimated_services = scope_analysis.get("estimated_services", 1)

            # Calculate chunking for AI assessment
            task_desc_for_chunking = task_description if task_description else ""
            ai_base_length = len(task_desc_for_chunking) * 2
            ai_estimated_size = ai_base_length + (ai_estimated_files * 2000) + (ai_estimated_services * 3000)
            ai_needs_chunk, ai_size_level, ai_chunks = needs_chunking(ai_estimated_size)

            return ComplexityAssessment(
                complexity=complexity,
                confidence=data.get("confidence", 0.75),
                reasoning=data.get("reasoning", "AI assessment"),
                signals=data.get("analysis", {}),
                estimated_files=ai_estimated_files,
                estimated_services=ai_estimated_services,
                external_integrations=data.get("analysis", {})
                .get("integrations", {})
                .get("external_services", []),
                infrastructure_changes=data.get("analysis", {})
                .get("infrastructure", {})
                .get("docker_changes", False),
                recommended_phases=data.get("recommended_phases", []),
                needs_research=flags.get("needs_research", False),
                needs_self_critique=flags.get("needs_self_critique", False),
                # Chunfor AI assessment
                estimated_spec_size=ai_estimated_size,
                requires_chunking=ai_needs_chunk,
                chunking_strategy=ai_size_level,
                suggested_chunks=ai_chunks,
            )

        return None

    except Exception:
        return None


def save_assessment(spec_dir: Path, assessment: ComplexityAssessment) -> Path:
    """Save complexity assessment to file."""
    assessment_file = spec_dir / "complexity_assessment.json"
    phases = assessment.phases_to_run()

    # Build output data
    output_data = {
        "complexity": assessment.complexity.value,
        "confidence": assessment.confidence,
        "reasoning": assessment.reasoning,
        "signals": assessment.signals,
        "estimated_files": assessment.estimated_files,
        "estimated_services": assessment.estimated_services,
        "external_integrations": assessment.external_integrations,
        "infrastructure_changes": assessment.infrastructure_changes,
        "phases_to_run": phases,
        "needs_research": assessment.needs_research,
        "needs_self_critique": assessment.needs_self_critique,
        # Chunking-related fields
        "estimated_spec_size": assessment.estimated_spec_size,
        "requires_chunking": assessment.requires_chunking,
        "chunking_strategy": assessment.chunking_strategy,
        "suggested_chunks": assessment.suggested_chunks,
        "created_at": datetime.now().isoformat(),
    }

    # Add multi-dimensional analysis if available
    if assessment.multi_dimensional:
        output_data["multi_dimensional_analysis"] = assessment.multi_dimensional.to_dict()

    with open(assessment_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    return assessment_file


def load_assessment(spec_dir: Path) -> ComplexityAssessment | None:
    """Load complexity assessment from file.

    Args:
        spec_dir: The spec directory containing the assessment file

    Returns:
        ComplexityAssessment if file exists and is valid, None otherwise
    """
    assessment_file = spec_dir / "complexity_assessment.json"
    if not assessment_file.exists():
        return None

    try:
        with open(assessment_file, encoding="utf-8") as f:
            data = json.load(f)

        return ComplexityAssessment(
            complexity=Complexity(data.get("complexity", "standard")),
            confidence=data.get("confidence", 0.5),
            reasoning=data.get("reasoning", ""),
            signals=data.get("signals", {}),
            estimated_files=data.get("estimated_files", 1),
            estimated_services=data.get("estimated_services", 1),
            external_integrations=data.get("external_integrations", []),
            infrastructure_changes=data.get("infrastructure_changes", False),
            recommended_phases=data.get("phases_to_run", []),
            needs_research=data.get("needs_research", False),
            needs_self_critique=data.get("needs_self_critique", False),
            estimated_spec_size=data.get("estimated_spec_size", 0),
            requires_chunking=data.get("requires_chunking", False),
            chunking_strategy=data.get("chunking_strategy", "single"),
            suggested_chunks=data.get("suggested_chunks", 1),
        )
    except (json.JSONDecodeError, KeyError, ValueError) as e:
        print(f"Failed to load complexity assessment: {e}")
        return None
