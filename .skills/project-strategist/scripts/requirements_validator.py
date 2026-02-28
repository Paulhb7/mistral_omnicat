#!/usr/bin/env python3
"""
Requirements Validator Script

Validates project requirements for completeness and quality.
Checks for SMART criteria and common issues.
"""

import re
import sys
from typing import List, Dict, Tuple


def validate_requirements(requirements_text: str) -> Dict[str, List[str]]:
    """
    Validate requirements text and return issues found.
    
    Args:
        requirements_text: Text containing requirements to validate
        
    Returns:
        Dictionary with issue categories and lists of specific issues
    """
    issues = {
        'format_issues': [],
        'quality_issues': [],
        'completeness_issues': [],
        'suggestions': []
    }
    
    lines = requirements_text.split('\n')
    requirement_lines = [line.strip() for line in lines if line.strip() and not line.strip().startswith(('#', '##', '###'))]
    
    # Check for common format issues
    for i, line in enumerate(requirement_lines, 1):
        # Check for vague language
        vague_words = ['should', 'may', 'might', 'could', 'possibly', 'probably']
        if any(word in line.lower() for word in vague_words):
            issues['format_issues'].append(f"Line {i}: Uses vague language - prefer 'shall' for requirements")
        
        # Check for multiple requirements in one line
        if ' and ' in line.lower() or ' or ' in line.lower():
            if len(line.split()) > 20:  # Long line with connectors
                issues['format_issues'].append(f"Line {i}: May contain multiple requirements - consider splitting")
        
        # Check for testability
        if not any(word in line.lower() for word in ['shall', 'must', 'will', 'should']):
            issues['quality_issues'].append(f"Line {i}: Missing clear requirement indicator ('shall/must/will')")
    
    # Check for completeness
    if len(requirement_lines) < 5:
        issues['completeness_issues'].append("Few requirements found - most projects need 10-50+ requirements")
    
    # Check for requirement categories
    has_functional = any('functional' in line.lower() for line in lines)
    has_non_functional = any(word in line.lower() for word in ['performance', 'security', 'usability', 'reliability'] for line in lines)
    has_technical = any(word in line.lower() for word in ['technical', 'implementation', 'technology', 'stack'] for line in lines)
    
    if not has_functional:
        issues['completeness_issues'].append("No functional requirements section found")
    if not has_non_functional:
        issues['completeness_issues'].append("No non-functional requirements (performance, security, etc.) found")
    if not has_technical:
        issues['suggestions'].append("Consider adding technical requirements section")
    
    # Positive suggestions
    if len(requirement_lines) > 0:
        issues['suggestions'].append("✅ Requirements found - good start!")
    
    if not issues['format_issues'] and not issues['quality_issues'] and not issues['completeness_issues']:
        issues['suggestions'].append("🎉 Requirements look good! Ready for review.")
    
    return issues


def print_validation_report(issues: Dict[str, List[str]]) -> None:
    """Print a formatted validation report."""
    
    print("=" * 60)
    print("REQUIREMENTS VALIDATION REPORT")
    print("=" * 60)
    
    total_issues = sum(len(issue_list) for issue_list in issues.values() if issue_list and not issue_list[0].startswith('✅'))
    
    if total_issues == 0:
        print("🎉 EXCELLENT: No issues found!")
    else:
        print(f"⚠️  Found {total_issues} issues to address:")
    
    print()
    
    for category, issue_list in issues.items():
        if issue_list:
            print(f"{category.upper().replace('_', ' ')}:")
            for issue in issue_list:
                if issue.startswith('✅') or issue.startswith('🎉'):
                    print(f"  {issue}")
                else:
                    print(f"  • {issue}")
            print()
    
    print("=" * 60)
    
    # Exit with appropriate code
    if total_issues > 0:
        sys.exit(1)
    else:
        sys.exit(0)


def main():
    """Main function - read requirements from stdin or file."""
    
    if len(sys.argv) > 1:
        # Read from file
        try:
            with open(sys.argv[1], 'r', encoding='utf-8') as f:
                requirements_text = f.read()
        except FileNotFoundError:
            print(f"Error: File '{sys.argv[1]}' not found")
            sys.exit(1)
    else:
        # Read from stdin
        print("Enter requirements text (Ctrl+D to finish):")
        requirements_text = sys.stdin.read()
    
    if not requirements_text.strip():
        print("Error: No requirements text provided")
        sys.exit(1)
    
    issues = validate_requirements(requirements_text)
    print_validation_report(issues)


if __name__ == "__main__":
    main()