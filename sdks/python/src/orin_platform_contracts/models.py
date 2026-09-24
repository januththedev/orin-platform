from dataclasses import dataclass
from typing import Literal, Optional

ContractVersion = Literal["1.0.0"]
ModelAlias = Literal["orin-cheap", "orin-balanced", "orin-thinking", "orin-coding"]

@dataclass(frozen=True)
class SearchRequest:
    query: str
    n: int
    locale: Optional[Literal["en", "si", "ta"]] = None
    safe_search: Optional[Literal["off", "moderate", "strict"]] = None

@dataclass(frozen=True)
class ErrorEnvelope:
    code: str
    message: str
    retryable: bool
    retry_after: Optional[int]
    request_id: str
