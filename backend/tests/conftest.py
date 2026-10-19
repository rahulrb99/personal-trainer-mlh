"""Keep routine test collection away from developer/cloud databases."""
import os
from tempfile import TemporaryDirectory

_database_directory = TemporaryDirectory(prefix='spotter-tests-')
# backend.app loads .env without overriding process values. Explicit factory
# arguments and SPOTTER_TEST_DATABASE_URL still select disposable test databases.
os.environ['DATABASE_URL'] = ''
os.environ['SPOTTER_DATABASE'] = os.path.join(_database_directory.name, 'default.sqlite3')


def pytest_sessionfinish(session, exitstatus):
    _database_directory.cleanup()
