"""Faux Mongo async en mémoire, partagé par les tests unitaires (aucune base réelle)."""


def matches(doc, flt):
    """Matching de filtre Mongo minimal : égalité + $ne + $nin + $regex (préfixe ^)."""
    for k, v in (flt or {}).items():
        val = doc.get(k)
        if isinstance(v, dict):
            if "$ne" in v and val == v["$ne"]:
                return False
            if "$nin" in v and val in v["$nin"]:
                return False
            if "$in" in v and val not in v["$in"]:
                return False
            if "$regex" in v:
                import re
                if not re.search(v["$regex"], str(val or "")):
                    return False
        elif val != v:
            return False
    return True


class FakeCursor:
    def __init__(self, docs):
        self._docs = docs

    def sort(self, *a, **k):
        return self

    async def to_list(self, n):
        return [dict(d) for d in self._docs[: (n or len(self._docs))]]


class FakeResult:
    def __init__(self, matched=0, modified=0, deleted=0):
        self.matched_count = matched
        self.modified_count = modified
        self.deleted_count = deleted


class FakeCollection:
    def __init__(self):
        self.docs = []

    def find(self, flt=None, projection=None):
        return FakeCursor([d for d in self.docs if matches(d, flt)])

    async def find_one(self, flt=None, projection=None):
        for d in self.docs:
            if matches(d, flt):
                return dict(d)
        return None

    async def count_documents(self, flt=None):
        return len([d for d in self.docs if matches(d, flt)])

    async def insert_one(self, doc):
        self.docs.append(dict(doc))
        return FakeResult()

    async def update_one(self, flt, update, upsert=False):
        for d in self.docs:
            if matches(d, flt):
                d.update(update.get("$set", {}))
                return FakeResult(matched=1, modified=1)
        if upsert:
            base = dict(flt)
            base.update(update.get("$set", {}))
            self.docs.append(base)
            return FakeResult()
        return FakeResult()

    async def delete_one(self, flt):
        for i, d in enumerate(self.docs):
            if matches(d, flt):
                del self.docs[i]
                return FakeResult(deleted=1)
        return FakeResult(deleted=0)


class FakeDB:
    def __init__(self):
        self._colls = {}

    def __getitem__(self, name):
        return self._colls.setdefault(name, FakeCollection())

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        return self[name]
