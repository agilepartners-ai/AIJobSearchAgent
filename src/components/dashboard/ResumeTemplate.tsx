import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { UserProfileData } from '../../services/profileService';

interface ResumeTemplateProps {
  profile: UserProfileData;
  resumeHtml: string;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
  },
  section: {
    marginBottom: 10,
  },
  header: {
    fontSize: 24,
    marginBottom: 10,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 18,
    marginBottom: 5,
  },
  text: {
    fontSize: 12,
    marginBottom: 3,
  },
});

const ResumeTemplate: React.FC<ResumeTemplateProps> = ({ profile, resumeHtml }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.header}>{profile.fullName}</Text>
        <Text style={styles.text}>{profile.email}</Text>
        {profile.phone && <Text style={styles.text}>{profile.phone}</Text>}
        {profile.location && <Text style={styles.text}>{profile.location}</Text>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 5 }}>
          {profile.linkedin && <Text style={styles.text}>LinkedIn: {profile.linkedin}</Text>}
          {profile.github && <Text style={styles.text}>GitHub: {profile.github}</Text>}
          {profile.portfolio && <Text style={styles.text}>Portfolio: {profile.portfolio}</Text>}
        </View>
      </View>
      <View style={styles.section}>
        {/* Note: @react-pdf/renderer does not directly render HTML. */}
        {/* This will display the raw HTML string. For rich text, a parser is needed. */}
        <Text style={styles.subHeader}>Optimized Content</Text>
        <Text style={styles.text}>{resumeHtml.replace(/<[^>]*>?/gm, '')}</Text>
      </View>
    </Page>
  </Document>
);

export default ResumeTemplate;
