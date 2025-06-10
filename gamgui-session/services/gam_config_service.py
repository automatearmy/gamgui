"""
GAM configuration service for GAMGUI Session Manager.
Handles generation of GAM configuration files.
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


class GamConfigService:
    """Service for generating GAM configuration files"""

    def __init__(self, gam_config_dir: str):
        self.gam_config_dir = gam_config_dir

    def generate_gam_config(self, custom_settings: Optional[dict] = None) -> None:
        """
        Generate the GAM configuration file (gam.cfg) in the GAM config directory.

        Args:
            custom_settings: Optional dictionary of custom settings to override defaults
        """
        try:
            # Default GAM configuration
            default_config = {
                "activity_max_results": "100",
                "admin_email": "''",
                "api_calls_rate_check": "false",
                "api_calls_rate_limit": "100",
                "api_calls_tries_limit": "10",
                "auto_batch_min": "0",
                "bail_on_internal_error_tries": "2",
                "batch_size": "50",
                "cacerts_pem": "",
                "cache_dir": f"{self.gam_config_dir}/gamcache",
                "cache_discovery_only": "true",
                "channel_customer_id": "",
                "charset": "utf-8",
                "classroom_max_results": "0",
                "client_secrets_json": "client_secrets.json",
                "clock_skew_in_seconds": "10",
                "cmdlog": "",
                "cmdlog_max_backups": "5",
                "cmdlog_max_kilo_bytes": "1000",
                "config_dir": self.gam_config_dir,
                "contact_max_results": "100",
                "csv_input_column_delimiter": ",",
                "csv_input_no_escape_char": "true",
                "csv_input_quote_char": "'\"'",
                "csv_input_row_drop_filter": "",
                "csv_input_row_drop_filter_mode": "anymatch",
                "csv_input_row_filter": "",
                "csv_input_row_filter_mode": "allmatch",
                "csv_input_row_limit": "0",
                "csv_output_column_delimiter": ",",
                "csv_output_convert_cr_nl": "false",
                "csv_output_field_delimiter": "' '",
                "csv_output_header_drop_filter": "",
                "csv_output_header_filter": "",
                "csv_output_header_force": "",
                "csv_output_header_order": "",
                "csv_output_line_terminator": "lf",
                "csv_output_no_escape_char": "false",
                "csv_output_quote_char": "'\"'",
                "csv_output_row_drop_filter": "",
                "csv_output_row_drop_filter_mode": "anymatch",
                "csv_output_row_filter": "",
                "csv_output_row_filter_mode": "allmatch",
                "csv_output_row_limit": "0",
                "csv_output_sort_headers": "",
                "csv_output_subfield_delimiter": ".",
                "csv_output_timestamp_column": "",
                "csv_output_users_audit": "false",
                "customer_id": "my_customer",
                "debug_level": "0",
                "device_max_results": "200",
                "domain": "''",
                "drive_dir": f"{self.gam_config_dir}/downloads",
                "drive_max_results": "1000",
                "drive_v3_beta": "false",
                "drive_v3_native_names": "true",
                "email_batch_size": "50",
                "enable_dasa": "false",
                "enable_gcloud_reauth": "false",
                "event_max_results": "250",
                "extra_args": "",
                "gmail_cse_incert_dir": "",
                "gmail_cse_inkey_dir": "",
                "inter_batch_wait": "0",
                "license_max_results": "100",
                "license_skus": "",
                "meet_v2_beta": "false",
                "member_max_results": "200",
                "member_max_results_ci_basic": "1000",
                "member_max_results_ci_full": "500",
                "message_batch_size": "50",
                "message_max_results": "500",
                "mobile_max_results": "100",
                "multiprocess_pool_limit": "0",
                "never_time": "Never",
                "no_browser": "false",
                "no_cache": "false",
                "no_short_urls": "false",
                "no_update_check": "true",
                "no_verify_ssl": "false",
                "num_tbatch_threads": "2",
                "num_threads": "5",
                "oauth2_txt": "oauth2.txt",
                "oauth2service_json": "oauth2service.json",
                "output_dateformat": "",
                "output_timeformat": "",
                "people_max_results": "100",
                "print_agu_domains": "",
                "print_cros_ous": "",
                "print_cros_ous_and_children": "",
                "process_wait_limit": "0",
                "quick_cros_move": "false",
                "quick_info_user": "false",
                "reseller_id": "",
                "retry_api_service_not_available": "false",
                "section": "",
                "show_api_calls_retry_data": "false",
                "show_commands": "false",
                "show_convert_cr_nl": "false",
                "show_counts_min": "1",
                "show_gettings": "true",
                "show_gettings_got_nl": "false",
                "show_multiprocess_info": "false",
                "smtp_fqdn": "",
                "smtp_host": "",
                "smtp_password": "",
                "smtp_username": "",
                "timezone": "utc",
                "tls_max_version": "",
                "tls_min_version": "TLSv1_3",
                "todrive_clearfilter": "false",
                "todrive_clientaccess": "false",
                "todrive_conversion": "true",
                "todrive_localcopy": "false",
                "todrive_locale": "",
                "todrive_no_escape_char": "true",
                "todrive_nobrowser": "false",
                "todrive_noemail": "false",
                "todrive_parent": "root",
                "todrive_sheet_timeformat": "copy",
                "todrive_sheet_timestamp": "copy",
                "todrive_timeformat": "",
                "todrive_timestamp": "false",
                "todrive_timezone": "",
                "todrive_upload_nodata": "true",
                "todrive_user": "",
                "truncate_client_id": "false",
                "update_cros_ou_with_id": "false",
                "use_chat_admin_access": "false",
                "use_course_owner_access": "false",
                "use_projectid_as_name": "false",
                "user_max_results": "500",
                "user_service_account_access_only": "false",
            }

            # Merge custom settings if provided
            if custom_settings:
                default_config.update(custom_settings)
                logger.info(f"Applied {len(custom_settings)} custom settings to GAM config")

            # Generate the config file content
            config_content = "[DEFAULT]\n"
            for key, value in default_config.items():
                config_content += f"{key} = {value}\n"

            # Write the GAM config file
            config_file_path = os.path.join(self.gam_config_dir, "gam.cfg")
            with open(config_file_path, "w", encoding="utf-8") as f:
                f.write(config_content)

            # Set appropriate permissions
            os.chmod(config_file_path, 0o644)

            # Set the GAMCFGDIR environment variable
            os.environ["GAMCFGDIR"] = self.gam_config_dir

            logger.info(f"GAM configuration file generated: {config_file_path}")
            logger.info(f"GAMCFGDIR environment variable set to: {self.gam_config_dir}")

        except Exception as e:
            logger.error(f"Error generating GAM config file: {e}")
            raise

    def create_downloads_directory(self) -> None:
        """
        Create the downloads directory referenced in the GAM config.
        """
        try:
            downloads_dir = os.path.join(self.gam_config_dir, "downloads")
            os.makedirs(downloads_dir, exist_ok=True)
            logger.info(f"GAM downloads directory created: {downloads_dir}")
        except Exception as e:
            logger.error(f"Error creating downloads directory: {e}")
            raise

    def create_cache_directory(self) -> None:
        """
        Create the cache directory referenced in the GAM config.
        """
        try:
            cache_dir = os.path.join(self.gam_config_dir, "gamcache")
            os.makedirs(cache_dir, exist_ok=True)
            logger.info(f"GAM cache directory created: {cache_dir}")
        except Exception as e:
            logger.error(f"Error creating cache directory: {e}")
            raise
