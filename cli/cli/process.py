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
from typing import Dict, List, Optional, Union

from rich.console import Console
from rich.table import Table

console = Console()

class JobStatus(str, Enum):
    """Job status enum."""
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
    """Process manager for background jobs."""
    def __init__(self):
        """Initialize process manager."""
        self.jobs_file = Path.home() / ".tiktoken" / "jobs.json"
        self.services_file = Path.home() / ".tiktoken" / "services.json"
        
        # Create directory if it doesn't exist
        self.jobs_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize files if they don't exist
        if not self.jobs_file.exists():
            self._save_jobs({})
        if not self.services_file.exists():
            self._save_services({})
    
    def _load_jobs(self) -> Dict[str, Dict]:
        """Load jobs from file."""
        try:
            with open(self.jobs_file) as f:
                return json.load(f)
        except Exception:
            return {}
    
    def _save_jobs(self, jobs: Dict[str, Dict]):
        """Save jobs to file."""
        with open(self.jobs_file, "w") as f:
            json.dump(jobs, f)
    
    def _load_services(self) -> Dict[str, Dict]:
        """Load services from file."""
        try:
            with open(self.services_file) as f:
                return json.load(f)
        except Exception:
            return {}
    
    def _save_services(self, services: Dict[str, Dict]):
        """Save services to file."""
        with open(self.services_file, "w") as f:
            json.dump(services, f)
    
    def run_background(self, command: str) -> Job:
        """Run a command in the background."""
        job_id = f"job_{int(time.time())}"
        
        # Start process
        subprocess.Popen(
            command.split(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Create job
        job = Job(
            id=job_id,
            command=command,
            status=JobStatus.RUNNING,
            start_time=time.time()
        )
        
        # Save job
        jobs = self._load_jobs()
        jobs[job_id] = job.__dict__
        self._save_jobs(jobs)
        
        return job
    
    def list_jobs(self) -> List[Job]:
        """List all jobs."""
        jobs = []
        for job_data in self._load_jobs().values():
            try:
                # Convert string status to enum
                job_data["status"] = JobStatus(job_data["status"])
                jobs.append(Job(**job_data))
            except Exception:
                continue
        return jobs
    
    def update_job_status(self, job_id: str, status: JobStatus, exit_code: Optional[int] = None):
        """Update job status."""
        jobs = self._load_jobs()
        if job_id in jobs:
            jobs[job_id]["status"] = status
            if exit_code is not None:
                jobs[job_id]["exit_code"] = exit_code
            self._save_jobs(jobs)
    
    def cleanup_jobs(self):
        """Clean up completed jobs."""
        jobs = self._load_jobs()
        active_jobs = {
            job_id: job_data
            for job_id, job_data in jobs.items()
            if job_data["status"] == JobStatus.RUNNING
        }
        self._save_jobs(active_jobs)
    
    def update_service_status(self, service: str, status: Dict):
        """Update service status."""
        services = self._load_services()
        services[service] = {
            **status,
            "last_updated": time.strftime("%Y-%m-%dT%H:%M:%S.%f")
        }
        self._save_services(services)
    
    def get_service_status(self, service: str) -> Dict:
        """Get service status."""
        return self._load_services().get(service, {})
    
    def show_status(self):
        """Show status of services and jobs."""
        # Show services status
        services_status = self._load_services()
        
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
        active_jobs = [job for job in self.list_jobs() if job.status == JobStatus.RUNNING]
        if active_jobs:
            console.print("\n[bold]Active Jobs:[/bold]")
            table = Table(show_header=True)
            table.add_column("ID", style="cyan")
            table.add_column("Command", style="magenta")
            table.add_column("Running For", style="yellow")
            
            for job in active_jobs:
                running_time = time.time() - job.start_time
                table.add_row(
                    job.id,
                    job.command,
                    f"{running_time:.1f}s"
                )
            
            console.print(table) 