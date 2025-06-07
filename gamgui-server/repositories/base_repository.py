"""Base repository for all GAMGUI repositories"""

from datetime import UTC, datetime
from typing import Any, Generic, List, Optional, Type, TypeVar

from firebase_admin import firestore

from clients.firestore_client import get_db
from models.base_model import BaseModel

T = TypeVar("T", bound=BaseModel)


class BaseRepository(Generic[T]):
    """Base repository implementation with Firestore"""

    def __init__(self, model_class: Type[T], collection_name: str):
        """Initialize repository with model class and collection name"""
        self.model_class = model_class
        self.collection_name = collection_name
        self.db = get_db()

    def _get_collection(self) -> firestore.CollectionReference:
        """Get reference to the Firestore collection"""
        return self.db.collection(self.collection_name)

    def _get_document_ref(self, doc_id: str) -> firestore.DocumentReference:
        """Get reference to a specific document"""
        return self._get_collection().document(doc_id)

    async def get_by_id(self, id: str) -> Optional[T]:
        """Get entity by ID"""
        doc_ref = self._get_document_ref(id)
        doc = doc_ref.get()

        if doc.exists:
            data = doc.to_dict()
            if data:
                data["id"] = doc.id
                return self.model_class.from_dict(data)

        return None

    async def get_all(self) -> List[T]:
        """Get all entities"""
        docs = self._get_collection().stream()
        entities = []

        for doc in docs:
            data = doc.to_dict()
            if data:
                data["id"] = doc.id
                entities.append(self.model_class.from_dict(data))

        return entities

    async def create(self, entity: T) -> T:
        """Create a new entity"""
        entity.created_at = datetime.now(UTC)
        entity.updated_at = datetime.now(UTC)

        data = entity.to_dict()
        doc_ref = self._get_document_ref(entity.id)
        doc_ref.set(data)

        return entity

    async def update(self, entity: T) -> T:
        """Update an existing entity"""
        entity.updated_at = datetime.now(UTC)

        data = entity.to_dict()
        doc_ref = self._get_document_ref(entity.id)
        doc_ref.update(data)

        return entity

    async def delete(self, id: str) -> bool:
        """Delete an entity by ID"""
        doc_ref = self._get_document_ref(id)
        doc_ref.delete()

        return True

    async def query(self, field: str, operator: str, value: Any) -> List[T]:
        """Query entities by field, operator, and value"""
        query = self._get_collection().where(field, operator, value)
        docs = query.stream()
        entities = []

        for doc in docs:
            data = doc.to_dict()
            if data:
                data["id"] = doc.id
                entities.append(self.model_class.from_dict(data))

        return entities

    async def query_multi(self, filters: List[tuple]) -> List[T]:
        """Query entities with multiple filters"""
        query = self._get_collection()
        for field, operator, value in filters:
            query = query.where(field, operator, value)

        docs = query.stream()
        entities = []

        for doc in docs:
            data = doc.to_dict()
            if data:
                data["id"] = doc.id
                entities.append(self.model_class.from_dict(data))

        return entities
