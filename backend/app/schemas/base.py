import re

from marshmallow import Schema, post_dump, pre_load


def _to_camel(snake_str: str) -> str:
    parts = snake_str.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


def _to_snake(camel_str: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", camel_str).lower()


class CamelCaseSchema(Schema):
    """Base schema converting camelCase (API boundary) <-> snake_case (internal)."""

    @pre_load
    def decamelize(self, data, **kwargs):
        if not isinstance(data, dict):
            return data
        return {_to_snake(key): value for key, value in data.items()}

    @post_dump
    def camelize(self, data, **kwargs):
        return {_to_camel(key): value for key, value in data.items()}
