from strands import tool


@tool
def add_subtract(a: float, b: float, operation: str) -> float:
    """Perform addition or subtraction on two numbers.

    Args:
        a: The first number
        b: The second number
        operation: The operation to perform, either "add" or "subtract"
    """
    if operation == "add":
        return a + b
    elif operation == "subtract":
        return a - b
    else:
        return f"Unknown operation: {operation}. Use 'add' or 'subtract'."


@tool
def multiply(a: float, b: float) -> float:
    """Multiply two numbers together.

    Args:
        a: The first number
        b: The second number
    """
    return a * b
