"""Process management for TikToken CLI.

Handles background jobs, status caching, and non-blocking operations to ensure
the Zero-wait Property of the CLI.
"""
import asyncio
import json
import os
import signal
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Union, Any

from rich.console import Console
from rich.table import Table

console = Console()

class JobStatus(Enum):
    """Background job status."""
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class Job:
    """Background job."""
    id: str
    command: str
    status: JobStatus
    start_time: float
    exit_code: Optional[int] = None

class ProcessManager:
    """Manage background processes and service status."""
    
    def __init__(self):
        self._jobs = {}
        self._services = {}
    
    def run_background(self, cmd: str) -> str:
        """Run a command in the background."""
        job_id = f"job_{int(time.time())}"
        self._jobs[job_id] = {
            "command": cmd,
            "status": JobStatus.RUNNING,
            "start_time": time.time(),
            "exit_code": None,
            "error": None
        }
        return job_id
    
    def update_job_status(self, job_id: str, status: JobStatus, exit_code: Optional[int] = None, error: Optional[str] = None):
        """Update job status."""
        if job_id in self._jobs:
            self._jobs[job_id].update({
                "status": status,
                "exit_code": exit_code,
                "error": error
            })
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get job status."""
        return self._jobs.get(job_id, {})
    
    def list_jobs(self):
        """List all jobs."""
        return self._jobs
    
    def cleanup_jobs(self, max_age: int = 3600):
        """Clean up old jobs."""
        now = time.time()
        self._jobs = {
            job_id: job for job_id, job in self._jobs.items()
            if now - job["start_time"] < max_age
        }
    
    def update_service_status(self, service: str, status: Dict[str, Any]):
        """Update service status."""
        self._services[service] = status
    
    def get_service_status(self, service: str) -> Dict[str, Any]:
        """Get service status."""
        return self._services.get(service, {})
    
    def list_services(self):
        """List all services."""
        return self._services
    
    def show_status(self):
        """Show status of services and jobs."""
        # Show services status
        services_status = self._services
        
        table = Table(title="Services Status")
        table.add_column("Service", style="cyan")
        table.add_column("Status", style="magenta")
        table.add_column("Last Updated", style="yellow")
        
        for service, status in services_status.items():
            status_color = "green" if status.get("healthy", False) else "red"
            table.add_row(
                service,
                f"[{status_color}]{status.get('status', 'unknown')}[/]",
                status.get("last_updated", "never")
            )
        
        console.print(table)
        
        # Show active jobs
        active_jobs = [job for job in self.list_jobs().values() if job["status"] == JobStatus.RUNNING]
        if active_jobs:
            console.print("\n[bold]Active Jobs:[/bold]")
            table = Table(show_header=True)
            table.add_column("ID", style="cyan")
            table.add_column("Command", style="magenta")
            table.add_column("Running For", style="yellow")
            
            for job in active_jobs:
                running_time = time.time() - job["start_time"]
                table.add_row(
                    job["id"],
                    job["command"],
                    f"{running_time:.1f}s"
                )
            
            console.print(table) 