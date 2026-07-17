import { Box, Container, IconButton, Link as MuiLink, Stack, Typography } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import FacebookIcon from '@mui/icons-material/Facebook';
import { Link as RouterLink } from 'react-router-dom';

const SOCIAL_LINKS = [
  { label: 'LinkedIn', icon: <LinkedInIcon />, href: 'https://www.linkedin.com/company/intellino-sarl/' },
  { label: 'Facebook', icon: <FacebookIcon />, href: 'https://web.facebook.com/people/IntellIno/61581055343593/' },
];

export default function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 8, py: 4 }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} EduAfrique — Une solution Intellino.
          </Typography>
          <Stack direction="row" spacing={2}>
            <MuiLink component={RouterLink} to="/terms" variant="body2" color="text.secondary">
              CGU
            </MuiLink>
            <MuiLink component={RouterLink} to="/privacy" variant="body2" color="text.secondary">
              Confidentialité
            </MuiLink>
          </Stack>
          <Stack direction="row" spacing={1}>
            {SOCIAL_LINKS.map((link) => (
              <IconButton
                key={link.label}
                component="a"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                size="small"
                sx={{ color: 'text.secondary' }}
              >
                {link.icon}
              </IconButton>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
