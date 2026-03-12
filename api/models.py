from typing import Any

from pydantic import BaseModel, Field


class ChunkNode(BaseModel):
    id: str
    name: str
    type: str
    description: str


class ChunkEdge(BaseModel):
    source: str
    target: str
    relation: str
    rationale: str


class ChunkGraph(BaseModel):
    nodes: list[ChunkNode] = Field(default_factory=list)
    edges: list[ChunkEdge] = Field(default_factory=list)


class GraphNode(BaseModel):
    id: str
    name: str
    type: str
    description: str = ""
    risk_score: int = 0
    risk_level: str = "low"
    degree: float = 0.0
    betweenness: float = 0.0
    closeness: float = 0.0
    blast_radius: int = 0
    dependency_span: int = 0
    risk_explanation: str = ""
    source: str = "user"


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str = "depends_on"
    rationale: str = ""


class MergedGraph(BaseModel):
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


def model_dump_compat(instance: BaseModel) -> dict[str, Any]:
    if hasattr(instance, "model_dump"):
        return instance.model_dump()
    return instance.dict()


def model_validate_compat(model_cls, payload: Any):
    if hasattr(model_cls, "model_validate"):
        return model_cls.model_validate(payload)
    return model_cls.parse_obj(payload)


def model_json_schema_compat(model_cls) -> dict[str, Any]:
    if hasattr(model_cls, "model_json_schema"):
        return model_cls.model_json_schema()
    return model_cls.schema()
