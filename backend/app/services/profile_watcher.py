import os
import asyncio
import configparser
from typing import Set, List

from app.config import settings
from app.database import SessionLocal
from app.services import billing_service


def _load_aws_profiles() -> Set[str]:
    """Load AWS profile names from the standard credentials file.
    Returns a set of profile names. If the file does not exist, returns empty set.
    """
    credentials_path = os.path.join(os.path.expanduser("~"), ".aws", "credentials")
    if not os.path.exists(credentials_path):
        return set()
    parser = configparser.ConfigParser()
    parser.read(credentials_path)
    return set(parser.sections())


class ProfileWatcher:
    """Periodically checks for new AWS CLI profiles and triggers a sync for them."""

    def __init__(self):
        self._known_profiles: Set[str] = _load_aws_profiles()
        self._interval: int = settings.PROFILE_SYNC_CHECK_INTERVAL

    async def _trigger_sync_for_profile(self, profile: str):
        """Create a DB session and invoke the billing service sync for the given profile."""
        db = SessionLocal()
        try:
            # Use the default months_back from settings
            billing_service.run_sync(
                db=db,
                months_back=settings.SYNC_MONTHS_DEFAULT,
                cloud="aws",
                cloud_account=profile,
            )
        finally:
            db.close()

    async def run_periodic_check(self):
        """Background coroutine that runs forever, checking for new profiles.
        When a new profile is detected, it triggers a sync for that profile.
        """
        while True:
            await asyncio.sleep(self._interval)
            current_profiles = _load_aws_profiles()
            new_profiles: List[str] = [p for p in current_profiles if p not in self._known_profiles]
            if new_profiles:
                for profile in new_profiles:
                    asyncio.create_task(self._trigger_sync_for_profile(profile))
                # Update known set after scheduling syncs
                self._known_profiles.update(new_profiles)
